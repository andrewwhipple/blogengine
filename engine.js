//Requires
var express = require('express');
var app = express();
var fs = require('fs');
var marked = require('marked');
var favicon = require('serve-favicon');

var postTemplate = fs.readFileSync("./views/postTemplate.meow").toString();
var linkPostTemplate = fs.readFileSync("./views/linkPostTemplate.meow").toString();

//Meta-tag information
var meta = {
    "meta-description": "Andrew Whipple's website",
    "meta-keywords": "andrew, whipple, podcast, writing, tech, blog",
    "meta-author": "Andrew Whipple"
}

app.use(favicon(__dirname + '/static/favicon.ico'));

//The meow templating engine. It's silly. It's unnecessary. But eh, why not?
app.engine('meow', function(filePath, options, callback) {
    fs.readFile(filePath, function(err, content) {
        if (err) {
            return callback(new Error(err));
        }
        var rendered = "";
        rendered = content.toString().replace('{{title}}', options.title).replace('{{body}}', options.body).replace("{{meta-description}}", meta["meta-description"]).replace("{{meta-keywords}}", meta["meta-keywords"]).replace("{{meta-author}}", meta["meta-author"]);
        
        return callback(null, rendered);
    });
});

//Setting the views directory and the view engine
app.set('views', './views');
app.set('view engine', 'meow');

/*Base path to where the blog and pages folders live. This means you can host the blog in a 
    folder that is completely separate from where the source code lives. The reason behind this
    is since the whole impetus behind the engine is to use Dropbox as a source for syncing and dropping
    markdown files, and this lets that be done in a dropbox folder somewhere, while the code lives in a 
    code folder somewhere else. 
    
    Moral of the story: replace "." with the path to the '/blog/' folder, following the data-based 
    sub-directory conventions laid out (eventually) in the README.
*/
var filePath = ".";

//Handle the static files
app.use('/css', express.static(__dirname + '/css'));
app.use('/scripts', express.static(__dirname + '/scripts'));
app.use('/fonts', express.static(__dirname + '/fonts'));
app.use('/static', express.static(__dirname + '/static'));

//Route handler for the homepage, responsible for creating the blogroll
app.get('/', function(req, res) {
    fs.readFile(filePath + '/blog/postList.json', function(err, content) {
        if (err) {
            return callback(new Error(err));
        } 
        var postList = JSON.parse(content);
        //Ordering is by date, most recent first, and reverse alphabetical if multiple on one day.
        postList.posts.sort();
        postList.posts.reverse();
        var blogRollHTML = "";
        var blogRollPosts = [5];
        for (var i = 0; i < 5; i++) {
            if (i < postList.posts.length) {
                blogRollPosts[i] = fs.readFileSync(filePath + '/blog/' + postList.posts[i]);
            } else {
                blogRollPosts[i] = null;
            }
        }
        
        //NEED TO FIGURE OUT HOW TO GET THE TITLE, LINKS, METADATA INTO THE BLOGROLL HTML.
        for (var j = 0; j < 5; j++) {
            if (blogRollPosts[j]) {
                
                blogRollHTML += processPost(blogRollPosts[j]).html;
                blogRollHTML += "<br>";
            }
        }
        res.render('index', {body: blogRollHTML, title: "Andrew Whipple"});
    });
    
    
});


//Route handler for individual blog post permalinks
app.get('/blog/:year/:month/:day/:post/', function(req, res) {
    var path = "" + req.params.year + "/" + req.params.month + "/" + req.params.day + "/";
    grabBlogMarkdown(req.params.post, path, function(err, data) {
        if (err) {
            res.redirect('/404');
        } else {
            var postBody = processPost(data);
            
            res.render('index', {title: postBody.title, body: postBody.html});
        }
    }); 
    
});

//Route handler for the monthly archive pages. Basically a modified index blogroll page.
app.get('/blog/:year/:month/', function(req, res) {
    fs.readFile(filePath + '/blog/postList.json', function(err, content) {
        if (err) {
            return callback(new Error(err));
        } 
        
        var dateString = req.params.year + "/" + req.params.month + "/";
         
        var postList = JSON.parse(content);
        //Ordering is by date, most recent first, and reverse alphabetical if multiple on one day.
        postList.posts.sort();
        postList.posts.reverse();
        var blogRollHTML = "";
        var blogRollPosts = [];
        for (var i = 0; i < postList.posts.length; i++) {
            if (postList.posts[i].toString().indexOf(dateString) !== -1) {
                blogRollPosts.push(fs.readFileSync(filePath + '/blog/' + postList.posts[i]));
            }
        }
        
        //NEED TO FIGURE OUT HOW TO GET THE TITLE, LINKS, METADATA INTO THE BLOGROLL HTML.
        for (var j = 0; j < blogRollPosts.length; j++) {
            if (blogRollPosts[j]) {
                
                blogRollHTML += processPost(blogRollPosts[j]).html;
                blogRollHTML += "<br>";
            }
        }
        res.render('index', {body: blogRollHTML, title: "Andrew Whipple"});
    });
});

//Route handler for static pages
app.get('/:page', function(req, res) {
    grabPageMarkdown(req.params.page, function(err, data) {
        if (err) {
            res.redirect('/404');
        } else {
            
            var pageString = data.toString();
            var metaDataRaw = pageString.match(/@@:.*:@@/)[0];
            
            var metaDataClean = metaDataRaw.replace("@@:", "{").replace(":@@", "}");
            var metaDataParsed = JSON.parse(metaDataClean);
            
            
            
            pageBodyHTML = marked(pageString.replace(/@@:.*:@@/, ""));
            pageBodyHTML = '<div class="mw-page">' + pageBodyHTML + '</div>';
            res.render('index', {title: metaDataParsed.Title, body: pageBodyHTML});
        }
    })
});

//If all else fails! Must be last get handler. A generic 404-er
app.get('/*', function(req, res) {
   res.redirect('/404');

});

//Wrapper to handle filepaths to reading the blog markdown files
var grabBlogMarkdown = function(post, path, callback) {
    fs.readFile(filePath + '/blog/' + path + post + '.md', function(err, data) {
        
        callback(err, data);
    });
    
};

//Wrapper to handle filepaths to reading the static page markdown files
var grabPageMarkdown = function(post, callback) {
    fs.readFile(filePath + '/page/' + post + '.md', function(err, data) {
        callback(err, data);
    });
    
};

//Function to process the post, given a buffer of data from a markdown file, and turn it into correct html
var processPost = function(postData) {
    var postBodyHTML = postTemplate;
    var postString = postData.toString();
    var metaDataRaw = postString.match(/@@:.*:@@/)[0];
            
    var metaDataClean = metaDataRaw.replace("@@:", "{").replace(":@@", "}");
    var metaDataParsed = JSON.parse(metaDataClean);
                
    if (metaDataParsed.LinkPost) {
        postBodyHTML = linkPostTemplate;
        postBodyHTML = postBodyHTML.replace("{{permalink}}", metaDataParsed.Permalink);
                    
    }
                     
    postBodyHTML = postBodyHTML.replace("{{title}}", metaDataParsed.Title).replace("{{link}}", metaDataParsed.Link).replace("{{date}}", metaDataParsed.Date);
            
    postBodyHTML = postBodyHTML.replace("{{content}}", marked(postString.replace(/@@:.*:@@/, "")));
    
    return {"html": postBodyHTML, "title": metaDataParsed.Title};
}

//The server!
app.listen(process.env.PORT || 3000, function() {
    console.log('Listening on port ' + process.env.PORT);
});

