var posts=["posts/4a17b156.html","posts/96e9ca9a.html"];function toRandomPost(){
    pjax.loadUrl('/'+posts[Math.floor(Math.random() * posts.length)]);
  };