
from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),

    # API Routes
    path("new_post", views.new_post, name="new_post"),
    path("posts", views.all_posts, name="posts"),
    path("post/<int:id>", views.edit, name="edit_post"),
    path("post/<int:id>/like", views.like, name="liked"),
    path("user/<str:username>", views.profile, name="profile"),
    path("user/<str:username>/follow", views.follow, name="add_follow"),
    path("following", views.following, name="following_view"),
]
