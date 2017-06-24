//Requires
var express = require('express');
var app = express();
var fs = require('fs');
var marked = require('marked');
var favicon = require('serve-favicon');
var http = require('http');
var Promise = require('es6-promise').Promise;

Promise.polyfill();

//Wrapping the async readFile calls in a promise!
function readFilePromise(fileName) {
	return new Promise(function(resolve, reject){
		fs.readFile(fileName, function(err, content){
			if (err) {
				reject(err);
			}
			resolve(content);
		});
	});
}

var globalVars = {
    //Info relating to the final, surfaced web site.
    siteConfig: {
        "description": "",
        "navbar": "",
        "metaDescription": "",
        "metaKeywords": "",
        "metaAuthor": "",
        "defaultTitle": "",
		"postTemplate": "",
		"linkPostTemplate": ""
    },
    //Info relating to the running of the app code
    "appConfig": {
        "lastPulled": null,
        "configTTL": 1800000,
        "port": 80,
        //THIS DOES NEED TO BE PRE-SET in order to load the configs, after all
        "filePath": "../Dropbox/BlogPosts",
		"cacheMaxAge": 300
		//"filePath": "../../../../Dropbox/Apps/Editorial/BlogPosts"
    }
}

//Favicon loading
app.use(favicon(__dirname + '/favicon.ico'));

//The meow templating engine. It's silly. It's unnecessary. But eh, why not?
app.engine('spoon', function(filePath, options, callback) {
    fs.readFile(filePath, function(err, content) {
        if (err) {
            return callback(new Error(err));
        }
        var rendered = "";
        var now = new Date();
        rendered = content.toString().replace('{{title}}', options.title).replace('{{body}}', options.body).replace("{{meta-description}}", globalVars.siteConfig.metaDescription).replace("{{meta-keywords}}", globalVars.siteConfig.metaKeywords).replace("{{meta-author}}", globalVars.siteConfig.metaAuthor).replace("{{description}}", globalVars.siteConfig.description).replace("{{navbar}}", globalVars.siteConfig.navbar).replace("{{copyrightYear}}", now.getFullYear());
        
        return callback(null, rendered);
    });
});

//Setting the views directory and the view engine
app.set('views', './views');
app.set('view engine', 'spoon');

function loadTemplates() {
	var templates = ["./views/postTemplate.spoon", "./views/linkPostTemplate.spoon"].map(readFilePromise);

	Promise.all(templates).then(function(files) {
		globalVars.siteConfig.postTemplate = files[0].toString();
		globalVars.siteConfig.linkPostTemplate = files[1].toString();
	}).catch(function(err){
		console.log(err);
	});
}

function loadConfigs() {
    
    //DESPERATELY NEEDS ERROR HANDLING FOR BAD FILES HERE
    var configs = ["description.md", "navbar.md", "app-config.json", "site-config.json"];
	for (var i = 0; i < configs.length; i++) {
		configs[i] = globalVars.appConfig.filePath + '/config/' + configs[i];
	}
	configs = configs.map(readFilePromise);
	
	Promise.all(configs)
		.then(function(files) {
			globalVars.siteConfig.description = marked(files[0].toString());
			globalVars.siteConfig.navbar = marked(files[1].toString());
			
			var appConfig = JSON.parse(files[2]);
			var siteConfig = JSON.parse(files[3]);
			
		    globalVars.siteConfig.metaDescription = siteConfig.metaDescription;
		    globalVars.siteConfig.metaAuthor = siteConfig.metaAuthor;
		    globalVars.siteConfig.metaKeywords = siteConfig.metaKeywords;
		    globalVars.siteConfig.defaultTitle = siteConfig.defaultTitle;
    
		    globalVars.appConfig.configTTL = appConfig.configTTL;
		    globalVars.appConfig.port = appConfig.port;
		    globalVars.appConfig.filePath = appConfig.filePath;
			globalVars.appConfig.cacheMaxAge = appConfig.cacheMaxAge;
			
			globalVars.appConfig.lastPulled = Date.now();
			
		
		}).catch(function(err){
			console.log(err);
		});
}

loadConfigs();
loadTemplates();

//Handle the static files
app.use(express.static(globalVars.appConfig.filePath + '/static'));
app.use('/css', express.static(__dirname + '/css'));
app.use('/scripts', express.static(__dirname + '/scripts'));
app.use('/fonts', express.static(__dirname + '/fonts'));
//app.use('/static', express.static(filePath + '/static'));

function configTTLIsAgedOut() {
	return Date.now() - globalVars.appConfig.lastPulled > globalVars.appConfig.configTTL;
}

function getBlogroll(res, numPosts) {
    fs.readFile(globalVars.appConfig.filePath + '/blog/postList.json', function(err, content) {
        if (err) {
			console.log(err);
			return;
		} 
		var postList = JSON.parse(content);
		//Ordering is by date, most recent first, and reverse alphabetical if multiple on one day.
		postList.posts.sort();
		postList.posts.reverse();
		var blogRollHTML = "";
		
		blogRollPosts = [];

		for (var i = 0; i < numPosts; i++) {
			if (i < postList.posts.length) {
				blogRollPosts[i] = globalVars.appConfig.filePath + '/blog/' + postList.posts[i];
			} else {
				break;
			}
		}
		
		blogRollPosts = blogRollPosts.map(readFilePromise);

		Promise.all(blogRollPosts).then(function(posts) {
					
			for (var j = 0; j < posts.length; j++) {
				blogRollHTML += processPost(posts[j]).html;
				blogRollHTML += "<br>";
			}
			
			blogRollHTML += ' <div class="am-post"><a href="/archive"><h4>(More posts ➡)</h5></a></div>'
        	
			res.set('Cache-Control', 'public, max-age=' + globalVars.appConfig.cacheMaxAge);
			res.render('index', {body: blogRollHTML, title: globalVars.siteConfig.defaultTitle});
	
		}).catch(function(err) {
			console.log(err);
		});
	});
}


//Route handler for the homepage, responsible for creating the blogroll
app.get('/', function(req, res) {
    
    if (configTTLIsAgedOut()) {
        loadConfigs();
    }    
   
   	getBlogroll(res, 5);
   
});

//Route handler for the full, infinite scroll blogroll.
app.get('/blogroll', function(req, res) {
    
	getBlogroll(res, 100;
	
});

//Route handler for individual blog post permalinks
app.get('/blog/:year/:month/:day/:post/', function(req, res) {
    var path = "" + req.params.year + "/" + req.params.month + "/" + req.params.day + "/";
    grabBlogMarkdown(req.params.post, path, function(err, data) {
        if (err) {
            res.redirect('/404');
        } else {
            var postBody = processPost(data);   
			res.set('Cache-Control', 'public, max-age=' + globalVars.appConfig.cacheMaxAge);        
            res.render('index', {title: postBody.title, body: postBody.html});
        }
    }); 
});

//Route handler for the monthly archive pages. Basically a modified index blogroll page.
app.get('/blog/:year/:month/', function(req, res) {
    fs.readFile(globalVars.appConfig.filePath + '/blog/postList.json', function(err, content) {
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
                blogRollPosts.push(fs.readFileSync(globalVars.appConfig.filePath + '/blog/' + postList.posts[i]));
            }
        }
        
        //NEED TO FIGURE OUT HOW TO GET THE TITLE, LINKS, METADATA INTO THE BLOGROLL HTML.
        for (var j = 0; j < blogRollPosts.length; j++) {
            if (blogRollPosts[j]) {      
                blogRollHTML += processPost(blogRollPosts[j]).html;
                blogRollHTML += "<br>";
            }
        }
		res.set('Cache-Control', 'public, max-age=' + globalVars.appConfig.cacheMaxAge);
        res.render('index', {body: blogRollHTML, title: globalVars.siteConfig.defaultTitle});
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
            pageBodyHTML = '<div class="am-page">' + pageBodyHTML + '</div>';
            
			res.set('Cache-Control', 'public, max-age=' + globalVars.appConfig.cacheMaxAge);
			res.render('index', {title: metaDataParsed.Title, body: pageBodyHTML});
        }
    })
});

//If all else fails! Must be last get handler. A generic 404-er
app.get('/*', function(req, res) {
   res.redirect('/404');
});

//Wrapper to handle filepaths to reading the blog markdown files
function grabBlogMarkdown(post, path, callback) {
    fs.readFile(globalVars.appConfig.filePath + '/blog/' + path + post + '.md', function(err, data) {        
        callback(err, data);
    });
};

//Wrapper to handle filepaths to reading the static page markdown files
function grabPageMarkdown(post, callback) {
    fs.readFile(globalVars.appConfig.filePath + '/page/' + post + '.md', function(err, data) {
        callback(err, data);
    });
};

//Function to process the post, given a buffer of data from a markdown file, and turn it into correct html
function processPost(postData) {
    var postBodyHTML = globalVars.siteConfig.postTemplate;
    var postString = postData.toString();
    var metaDataRaw = postString.match(/@@:.*:@@/)[0];     
    var metaDataClean = metaDataRaw.replace("@@:", "{").replace(":@@", "}");
    var metaDataParsed = JSON.parse(metaDataClean);
                
    if (metaDataParsed.LinkPost) {
        postBodyHTML = globalVars.siteConfig.linkPostTemplate;
        postBodyHTML = postBodyHTML.replace("{{permalink}}", metaDataParsed.Permalink);
    }
    
    postBodyHTML = postBodyHTML.replace("{{title}}", metaDataParsed.Title).replace("{{link}}", metaDataParsed.Link).replace("{{date}}", metaDataParsed.Date);
            
    postBodyHTML = postBodyHTML.replace("{{content}}", marked(postString.replace(/@@:.*:@@/, "")));
    
    return {"html": postBodyHTML, "title": metaDataParsed.Title};
}

http.createServer(app).listen(globalVars.appConfig.port);

