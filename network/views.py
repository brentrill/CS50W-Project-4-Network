from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.shortcuts import render
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from django.core.paginator import Paginator

import json

from .models import User, Post, UserFollowing


def index(request):
    return render(request, "network/index.html")


def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "network/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "network/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))


def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "network/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "network/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "network/register.html")


@csrf_exempt
def new_post(request):
    if request.method != 'POST':
        return render(request, "index.html")
    
    json_data = json.loads(request.body)
    post = Post(poster=request.user, content=json_data['content'])
    post.save()

    return JsonResponse(post.serialize(), status=200)


def all_posts(request):
    # get all posts
    posts = Post.objects.all()

    response = {
        "posts": [post.serialize() for post in posts],
        "requester": request.user.username,
    }

    return pagination_api(request, response)


def pagination_api(request, response):
    page_number = int(request.GET.get("page", 1))
    per_page = int(request.GET.get("per_page", 10))
    paginator = Paginator(response["posts"], per_page)
    page_obj = paginator.get_page(page_number)

    response["page"] = {
        "current": page_obj.number,
        "has_next": page_obj.has_next(),
        "has_previous": page_obj.has_previous()
    }
    response["data"] = page_obj.object_list

    return JsonResponse(response, status=200)


@csrf_exempt
def like(request, id):
    post = Post.objects.get(id=id)
    liked = json.loads(request.body)['liked_state']

    # Update database
    if liked == 'like':
        post.liked.add(request.user)
    elif liked == 'unlike':
        post.liked.remove(request.user)
    post.save()

    response = {
        'liked_state': 'unlike' if liked == 'like' else 'like',
        'likes': post.liked.count()
    }

    return JsonResponse(response, status=200)


def follow(request, username):
    target = User.objects.get(username=username)

    if request.user == target:
        return HttpResponse("Do not follow yourself.", status=403)

    follow_check = UserFollowing.objects.filter(user=request.user, 
                                                following_user=target)
    if follow_check:
        follow_check.delete()
        follow_state = False
    else:
        follow_object = UserFollowing.objects.create(user=request.user, 
                                                    following_user=target)
        follow_object.save()
        follow_state = True
    
    response = {
        'requester': request.user.username,
        'username': username,
        'follow_state': follow_state,
        'following': target.following.count(),
        'followers': target.followers.count(),
    }

    return JsonResponse(response, status=200)


def following(request):
    requester = request.user.username
    # get posts from all users the requester is following
    user = User.objects.get(username=requester)
    follows = UserFollowing.objects.filter(user=user)
    following_users = [follows[i].following_user for i in range(len(follows))]
    posts = Post.objects.filter(poster__in=following_users)

    response = {
        'posts': [post.serialize() for post in posts],
        'requester': requester,
    }

    return pagination_api(request, response)


def profile(request, username):
    # logic to display follow/unfollow if user is signed in
    requester = request.user.username if request.user.is_authenticated else None
    target = User.objects.get(username=username)
    if requester:
        try:
            if UserFollowing.objects.get(user=request.user, following_user=target):
                follow_state = True
        except:
            follow_state = False
    else:
        follow_state = None

    # get posts from specific user
    user = User.objects.get(username=username)
    posts = Post.objects.filter(poster=user)

    response = {
        'username': user.username,
        'following': user.following.count(),
        'followers': user.followers.count(),
        'requester': requester,
        'follow_state': follow_state,
        'posts': [post.serialize() for post in posts],
    }

    return pagination_api(request, response)#JsonResponse(response, status=200)


@csrf_exempt
def edit(request, id):
    post = Post.objects.get(id=id)

    if post.poster != request.user:
        return HttpResponse('This post cannot be edited', status=403)

    json_data = json.loads(request.body)
    post.content = json_data['content']
    post.save()

    return JsonResponse({'content': json_data['content']}, status=200)
