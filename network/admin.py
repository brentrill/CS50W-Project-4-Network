from django.contrib import admin

from .models import User, Post, UserFollowing

admin.site.register(User)
admin.site.register(Post)
admin.site.register(UserFollowing)
