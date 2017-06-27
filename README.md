# blogengine
A repo for a home-built blog engine, mostly just to experiment and get better at webdev (especially Node.js)

In terms of inspiration, the idea of starting from scratch with a lightweight, new CMS written in Node came from seeing [Casey Liss](http://caseyliss.com) do the same with his engine [Camel](https://github.com/cliss/camel). I don't recall ever actually reading anything beyond Camel's README so I believe the only technical inspiration was using "@" signs to highlight metadata (though in a different way) but there may be unintentional inspiration snuck in.

*Design-wise* there's absolutely no question that [the site it currently powers](https://www.andrewwhipple.com) was *exceptionally* inspired by both [Casey Liss'](http://caseyliss.com) and [Marco Arment's](https://marco.org) blogs. 


### Done

* Basic routing up and running, routing to index ('/'), blog permalinks ('/blog/:year/:month/:day/:filename), static pages ('/:pageFileName'), and 404s.
* Dead-simple rendering engine, literally just replaces {{title}} and {{body}} and date things with stuff.
* A grossly-implemented blogroll with 5 posts on the main page, but NEEDS TO BE MANUALLY UPDATED IN postList.json!
* Psuedo-metadata: at the top of all markdown pages for blog posts, include (IN ONE LINE!!!) '@@: "Title": "title", "OtherMetadata": "Other" :@@
* Month archive blogroll thing (like marco.org) though with same metadata problem as the index page.
* The weird metadata bug fixed
* Link posts/permalinks
* Pulling app configs (stuff like port, filepath, etc) and site configs (stuff like the description, navbar links, site meta-tags) into json config files so they can be changed w/o a deploy
* Finally finally FIIIIIIIINALLY replacing the hacky and entirely anti-patterny "fs.readFileSync" calls with promises. Mostly. There's still one to kill.
* (My own shenanigans w/ the server setup to use SSL, but it's just an nginx reverse proxy so not actually part of this codebase)
* (Also caching, but again mostly through browser caching and then ussing the nginx reverse proxy to cache in front.)
* I *think*, as best as I can tell, that things are finally generic enough that I could spin up a new site with this engine with and it will just work? 



### To do

* Theme handling?
* Metadata on a per-post basis
* Tags
* Search?
* Some sort of automaticity to the post updating, since it's a bit of a chore to add a new post.
* Better decomposition, especially of some of the GET handlers
* Testing with a fresh install on a new server to make sure the setup script works and the code is suitably generic
* Once everything seems solid, write up documentation, transfer to a new repo for actual clean usage, and turn this into the "andrewwhipple.com" repo.


### Post Formatting:

Start every post with post metadata, namely: 

`"@@: "Title": "PostTitle", "Date": "PostDate", "Link": "Link", "LinkPost": bool :@@"`

If `LinkPost` is `true`, then also include the `"Permalink": "PostPermalink"` info in the meta data

Then start a separate line, and write whatever content you want in markdown (or html if ya nasty.)

