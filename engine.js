//Requires
var express = require('express');
var app = express();
var fs = require('fs');
var marked = require('marked');
var favicon = require('serve-favicon');
var http = require('http');
var helmet = require('helmet');
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
        "filePath": process.env.AM_FILEPATH, //This is set in the "setup.sh" script, but on subsequent starts may need to be set in a startup script or equivalent. More info in README.
		"cacheMaxAge": 300
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

//Load the post templates into memory.
function loadTemplates() {
	var templates = ["./views/postTemplate.spoon", "./views/linkPostTemplate.spoon"].map(readFilePromise);

	Promise.all(templates).then(function(files) {
		globalVars.siteConfig.postTemplate = files[0].toString();
		globalVars.siteConfig.linkPostTemplate = files[1].toString();
	}).catch(function(err){
		console.log(err);
	});
}

//Load the configuration files into memory.
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
			
			//If the siteConfig info is mal-formed or nonexistent, will pass it through without question
		    globalVars.siteConfig.metaDescription = siteConfig.metaDescription;
		    globalVars.siteConfig.metaAuthor = siteConfig.metaAuthor;
		    globalVars.siteConfig.metaKeywords = siteConfig.metaKeywords;
		    globalVars.siteConfig.defaultTitle = siteConfig.defaultTitle;
    
			//If the appConfig info is mal-formed or nonexistent, will revert to the defaults
		    globalVars.appConfig.configTTL = appConfig.configTTL || globalVars.appConfig.configTTL;
		    globalVars.appConfig.port = appConfig.port || globalVars.appConfig.port;
		    globalVars.appConfig.filePath = appConfig.filePath || globalVars.appConfig.filePath;
			globalVars.appConfig.cacheMaxAge = appConfig.cacheMaxAge || globalVars.appConfig.cacheMaxAge;
			
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

app.use(helmet({
	noCache: false
}));


//Helper function to see if the TTL for the config data has expired
function configDataIsExpired() {
	return Date.now() - globalVars.appConfig.lastPulled > globalVars.appConfig.configTTL;
}

//Function to create a blogroll of posts. Takes a response object from an app.get call, as well as the number of posts to render in the blogroll. Returns nothing, but sends the eventual response to the client.
function getBlogroll(res, numPosts, searchString) {
	
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
		
		var blogRollPosts = [];
	
		searchString = searchString || "";
		numPosts = numPosts || postList.posts.length;

		
		for (var i = 0; i < numPosts; i++) {
			if (i < postList.posts.length && postList.posts[i].toString().indexOf(searchString) !== -1) {
				
				blogRollPosts.push(globalVars.appConfig.filePath + postList.posts[i] + '.md');
			} 
		}
		
		blogRollPosts = blogRollPosts.map(readFilePromise);	
		
		Promise.all(blogRollPosts).then(function(posts) {
			
			for (var j = 0; j < posts.length; j++) {
				blogRollHTML += getHTMLFromMarkdown(posts[j].toString(), true).html;
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

/*
Wrapper to read the the Markdown data from a given blog post filename and url path.

Takes the post (the filename of the blog post, minus the ".md" suffix); 
	the path (the date-structured URL path to the post file); 
	and the callback.

Passes into the callback the errors (if any) and the markdown from the file, as a string.
*/
function getBlogMarkdown(post, path, callback) {
    fs.readFile(globalVars.appConfig.filePath + '/blog/' + path + post + '.md', function(err, data) {        
        if (!err) data = data.toString();
        callback(err, data);
    });
};

/*
Wrapper like getBlogMarkdown, but searches the filepaths for pages. 
Only requires the page filename (minus the ".md" suffix) and a callback.

Passes into the callback the errors (if any) and the markdown from the file, as a string.
*/
function getPageMarkdown(page, callback) {
    fs.readFile(globalVars.appConfig.filePath + '/page/' + page + '.md', function(err, data) {
        if (!err) data = data.toString();
        callback(err, data);
    });
};

/*
Function to process the post, given markdown string from a markdown file, and turn it into correct html

Returns an object with the html of the post body and the title of the post.

*/
/*function getPostHTML(postData) {
    var postBodyHTML = globalVars.siteConfig.postTemplate;
    var metaDataRaw = postData.match(/@@:.*:@@/)[0];     
    var metaDataClean = metaDataRaw.replace("@@:", "{").replace(":@@", "}");
    var metaDataParsed = JSON.parse(metaDataClean);
                
    if (metaDataParsed.LinkPost) {
        postBodyHTML = globalVars.siteConfig.linkPostTemplate;
        postBodyHTML = postBodyHTML.replace("{{permalink}}", metaDataParsed.Permalink);
    }
    
    postBodyHTML = postBodyHTML.replace("{{title}}", metaDataParsed.Title).replace("{{link}}", metaDataParsed.Link).replace("{{date}}", metaDataParsed.Date);
            
    postBodyHTML = postBodyHTML.replace("{{content}}", marked(postData.replace(/@@:.*:@@/, "")));
    
    return {"html": postBodyHTML, "title": metaDataParsed.Title};
}*/

function parseMetaData(markdown) {
    var metaDataRaw = markdown.match(/@@:.*:@@/)[0];     
    var metaDataClean = metaDataRaw.replace("@@:", "{").replace(":@@", "}");
    return JSON.parse(metaDataClean);
}

function getHTMLFromMarkdown(markdown, isPost) {
    var metaData = parseMetaData(markdown);
	var documentHTML;
	var contentHTML = marked(markdown.replace(/@@:.*:@@/, ""));
	if (isPost) {
		if (metaData.LinkPost) {
			documentHTML = globalVars.siteConfig.linkPostTemplate;
			documentHTML = documentHTML.replace("{{permalink}}", metaData.Permalink);
		} else {
			documentHTML = globalVars.siteConfig.postTemplate;		
		}
		
		documentHTML = documentHTML.replace("{{title}}", metaData.Title).replace("{{link}}", metaData.Link).replace("{{date}}", metaData.Date);
		documentHTML = documentHTML.replace("{{content}}", contentHTML);
	} else {
		documentHTML = '<div class="am-page">' + contentHTML + '</div>';
	}
	
	return {"html": documentHTML, "title": metaData.Title};
	
	
}

//Route handler for the homepage, responsible for creating the main blogroll
app.get('/', function(req, res) {
    
    if (configDataIsExpired()) {
        loadConfigs();
    }    
   
   	getBlogroll(res, 5, null);
   
});

//Route handler for the full, infinite scroll blogroll.
app.get('/blogroll', function(req, res) {
    
	getBlogroll(res, null, null);
	
});

//Route handler for individual blog post permalinks
app.get('/blog/:year/:month/:day/:post/', function(req, res) {
    var path = "" + req.params.year + "/" + req.params.month + "/" + req.params.day + "/";
    getBlogMarkdown(req.params.post, path, function(err, data) {
        if (err) {
            res.redirect('/404');
        } else {
            var postBody = getHTMLFromMarkdown(data, true);   
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
         
        getBlogroll(res, null, dateString);
    });
});


app.get('/kill-cache', function(req, res) {
	res.redirect('/404');
});

//Route handler for static pages
app.get('/:page', function(req, res) {
    getPageMarkdown(req.params.page, function(err, data) {
        if (err) {
            res.redirect('/404');
        } else {
            var pageHTML = getHTMLFromMarkdown(data, false);
            
			res.set('Cache-Control', 'public, max-age=' + globalVars.appConfig.cacheMaxAge);
			res.render('index', {title: pageHTML.title, body: pageHTML.html});
        }
    })
});



//If all else fails! Must be last get handler. A generic 404-er
app.get('/*', function(req, res) {
   res.redirect('/404');
});

http.createServer(app).listen(globalVars.appConfig.port);

