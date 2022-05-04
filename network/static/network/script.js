let page = 1;
let currentView = 'index';

document.addEventListener('DOMContentLoaded', () => {

    const postForm = document.querySelector('#post-form')
    if (postForm) {
        postForm.addEventListener('submit', newPost);
    }

    const followingLink = document.querySelector('#following-link');
    if (followingLink) {
        followingLink.addEventListener('click', () => {
            page = 1;
            loadView('feed')});
    }

    // Pagination listeners
    document.querySelector('#btn-previous-page').addEventListener('click', onPrevClick);
    document.querySelector('#btn-next-page').addEventListener('click', onNextClick);

    loadView('index');
})


// Shows the passed view and hides others
function loadView(view, poster) {
    // show new post form only on index view
    const postForm = document.querySelector("#post-form-div");
    postForm.style.display = (view == 'index') ? 'block' : 'none';

    // profile view
    const profile = document.querySelector('#profile-div');
    profile.style.display = (view =='profile') ? 'block' : 'none';

    loadPosts(view, page, poster);
}


// TODO: code could be shortened by creating a 'url' variable then
// making only a single fetch request.
function loadPosts(view, page, poster) {
    // clear posts and title
    document.querySelector('#posts-div').innerHTML = "";
    document.querySelector('#title').innerHTML = '';

    // changing title and fetch based on view
    if (view == 'index') {
        document.querySelector('#title').innerHTML = 'All Posts'
        // GET request to /posts/ for all posts
        fetch(`/posts?page=${page}`)
        .then(response => response.json())
        .then(context => {
            context.data.forEach(post => addPostToPage({
                'post': post,
                'user': context['requester'],
            }));
            pagination(context);
        })
    } else if (view == 'profile') {
        document.querySelector('#title').innerHTML = `${poster}`
        // GET request to /{username}/ for profile posts
        fetch(`user/${poster}?page=${page}`)
        .then(response => response.json())
        .then(context => {
            context.data.forEach(post => addPostToPage({
                'post': post,
                'user': context['requester'],
            }));
            pagination(context);
        })
    } else if (view == 'feed') {
        document.querySelector('#title').innerHTML = 'Following Feed'
        // GET request to user/followng/ for posts from those followed
        fetch(`following?page=${page}`)
        .then(response => response.json())
        .then(context => {
            context.data.forEach(post => addPostToPage({
                'post': post,
                'user': context['requester'],
            }));
            pagination(context);
        })
    }
}


function newPost(event) {
    // stops page from reloading
    event.preventDefault();

    fetch('/new_post', {
        method: 'POST',
        body: JSON.stringify({
            content: document.querySelector('#post-form-content').value
        })
    })
    .then(response => response.json())
    .then(post => {
        addPostToPage({'post': post, 'user': post.poster, 'new': true})
        document.querySelector('#post-form-content').value = "";
    })
}


function addPostToPage(context) {
    // creates post HTML
    const post = document.createElement('div');
    post.className = "card mb-3";
    post.id = `${context.post.id}`;
    post.innerHTML = `
        <div class="card-body">
            <h5 class="card-title">@${context.post.poster}</h5>
            <p class="card-text">${context.post.content}</p>
            <textarea class="editor form-control" style="display:none"></textarea>
        </div>
        <div class="card-footer text-muted">${context.post.timestamp}</div>
        `;

    // listener for profile click
    const author = post.querySelector(".card-title");
    author.addEventListener('click', () => clickedAuthor(context.post));

    // like button present if signed in, then liked status found
    if (context.user) {
        const likers = context.post.liked;

        let likeButtonState = 'like';
        likers.forEach(liker => {
            if (liker == context.user) likeButtonState = 'unlike';
        })
        let likeButton = createLikeButton(likers.length, likeButtonState);
        post.querySelector('.card-body').appendChild(likeButton);

        // like button listener
        likeButton.firstChild.addEventListener('click', () => {
            clickedLikeButton(post, likeButtonState);
        })
    }

    // adds an edit button if user is poster
    if (context.post.poster == context.user) {
        const edit_button = document.createElement('button');
        edit_button.type = "button";
        edit_button.className = "float-right edit-button btn btn-secondary";
        edit_button.innerHTML = "Edit Post";
        edit_button.addEventListener('click', () => {
            clickedEditButton(post);
        })
        post.querySelector(".card-footer").appendChild(edit_button);
    }

    // adds post to page
    if (context.new) {
        document.querySelector('#posts-div').prepend(post);
    } else {
        document.querySelector('#posts-div').append(post);
    }
}


function createLikeButton(numLiked, status) {
    const button = document.createElement('button');
    button.type ="button";
    button.id = "like-button"
    button.className = "btn btn-light";
    // symbol changes based on like status
    button.innerHTML = status === 'like' ? `&#129293` : `&#10084;&#65039;`;

    const counter = document.createElement('span');
    counter.id = "like-counter"
    counter.className = "counter"
    counter.innerHTML = `${numLiked}`

    const likeDiv = document.createElement('div');
    likeDiv.className = "d-inline-block"
    likeDiv.appendChild(button);
    likeDiv.appendChild(counter);

    return likeDiv;
}


function clickedLikeButton(post, state) {
    fetch(`post/${post.id}/like`, {
        method: 'PUT',
        body: JSON.stringify({
            'liked_state': state
        })
    }).then(response => response.json())
    .then(data => {
        let likeButton = post.querySelector('#like-button');
        likeButton.innerHTML = state === 'like' ? `&#10084;&#65039;` : `&#129293`;
        post.querySelector('#like-counter').innerHTML = data['likes'];
        // this method gets rid of the click event listener, preventing
        // the ability to relike. the below code adds the ability to relike,
        // but only once without refreshing.
        likeButton.addEventListener('click', () => {
            state = state == 'like' ? 'unlike' : 'like';
            clickedLikeButton(post, state);
        })
    })
}


function clickedAuthor(post) {
    // GET to profile API route
    fetch(`user/${post.poster}`)
    .then(response => response.json())
    .then(data => {
        createProfile(data);
    });
}


function createProfile(data) {
    // create profile contents
    const profile = document.createElement('div');
    profile.innerHTML = `
        <h4>Following: ${data.following}</h4>
        <h4>Followers: ${data.followers}</h4>
    `;

    // adding follow button logic
    // user must be signed in and can't follow themselves
    if (data.requester && data.requester !== data.username){
        const followButton = document.createElement('button');
        followButton.innerHTML = data['follow_state'] ? 'Unfollow' : 'Follow';
        followButton.className = "btn btn-primary mb-3";
        followButton.id = "follow-button";
        profile.appendChild(followButton);
    }

    // follow button listener
    const followButton = profile.querySelector("#follow-button");
    if (followButton) {
        followButton.addEventListener('click', () => clickedFollowButton(data))
    }

    document.querySelector("#profile-div").innerHTML = "";
    document.querySelector("#profile-div").appendChild(profile);

    page = 1;
    loadView('profile', data.username);
}


function clickedFollowButton(data) {
    fetch(`user/${data['username']}/follow`)
    .then(response => response.json())
    .then(context => {
        createProfile(context);
    })
}


function onPrevClick() {
    page--;
    currentView = viewFinder();
    loadPosts(currentView.view, page, currentView.poster);
}


function onNextClick() {
    page++;
    currentView = viewFinder();
    loadPosts(currentView.view, page, currentView.poster);
}


// created to fix a pagination bug. it uses the title of the page to 
// determine the current view. there must be a better way.
function viewFinder() {
    let title = document.querySelector('#title').innerHTML;
    let view = '';
    let poster = '';
    if (title == 'All Posts') {
        view = 'index';
    } else if (title == 'Following Feed') {
        view = 'feed';
    } else {
        view = 'profile';
        poster = title;
    }
    return {view, poster};
}


// reads the context from pagination_api() in views.py to determine presence
// of next/prev button and current page.
function pagination(context) {
    document.querySelector('#btn-next-page').style.display = 
        context["page"]["has_next"] ? "block" : "none";

    document.querySelector('#btn-previous-page').style.display =
        context["page"]["has_previous"] ? "block" : "none";

    document.querySelector('#page-number').innerHTML = `
        Page ${context["page"]["current"]}
    `;
}


function clickedEditButton(post) {
    const content = post.querySelector('.card-text');
    const postId = post.id;
    const editArea = post.querySelector('.editor');
    const button = post.querySelector('.edit-button');

    // replaces the post with the edit area and
    // changes the value of the button, and back once finished.
    if (button.innerHTML == "Edit Post") {
        button.innerHTML = "Save Edit";
        content.style.display = "none";
        editArea.style.display = "block";
        editArea.value = content.innerHTML;
    } else {
        fetch(`post/${postId}`, {
            method: 'PUT',
            body: JSON.stringify({
                'content': editArea.value
            })
        })
        .then( () => {
            button.innerHTML = "Edit Post";
            content.innerHTML = editArea.value;
            editArea.value = "";
            editArea.style.display = "none";
            content.style.display = "block";
        })
    }
}