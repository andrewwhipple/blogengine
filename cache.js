//however you do exports



// cache class

class Cache {
    constructor(maxSize, maxCacheAge, maxBlogrollAge) {
        this.flushCache(maxSize, maxCacheAge, maxBlogrollAge);
    }
    
    flushCache(maxSize, maxCacheAge, maxBlogrollAge) {
        this._cacheStarted = new Date();
        this._blogrollCacheStarted = new Date();
        this._maxCacheAge = maxCacheAge || 21600;
        this._maxBlogrollAge = maxBlogrollAge || 1800;
        this._maxSize = maxSize || 20;
        
        this._blogrollHTML = null;
        this._postCacheList = [];
    }
    
    cacheBlogroll(html) {
        this._blogrollHTML = html;
        this._blogrollCacheStarted = new Date();
    }
    
    //returns the string of stored html for the blogroll, or null if nothing has been cached ever
    getBlogroll() {
        if (this._getBlogrollAge() > this._maxBlogrollAge) {
            this._blogrollHTML = null;
        }
        return this._blogrollHTML;
    }
    
   
    //takes a string for the url path of the post and a string for the html of the post page
    cachePost(urlPath, html) {
        if (this._postCacheList.length >= this._maxSize) {
            this._postCacheList.shift(); 
        } 
        this._postCacheList.push({
            'urlPath': urlPath,
            'html': html
        });
    }
    
    // takes a string of a url for a post, if found returns a string of the html for the page, if not returns null
    getPost(urlPath) {
        if (this._getCacheAge > this._maxCacheAge) {
            this.flushCache(this._maxSize, this._maxCacheAge, this._maxBlogrollAge);
            return null;
        }
        
        for (let i = 0; i < this._postCacheList.length; i++) {
            if (this._postCacheList[i].urlPath === urlPath) {
                return this._postCacheList[i].html;
            }
        }
        return null;
    }
    
    
     _getBlogrollAge() {
        let currentTime = new Date();
        return (currentTime - this._blogrollCacheStarted);
    }
    
    _getCacheAge() {
        let currentTime = new Date();
        return (currentTime - this._cacheStarted)
    }
    
}

function createCache(maxSize, maxCacheAge, maxBlogrollAge) {
    let cache = new Cache(maxSize, maxCacheAge, maxBlogrollAge);
    return cache;
}

module.exports = Cache;

function testCase() {
    var testCache = new Cache(1800, 2);
    //console.log(testCache);
    
    
    var post1 = {
        'urlPath': "/head/right/here",
        'html': '<div>WOW COOL</div>'
    }
    var post2 = {
        'urlPath': "/meow/right/there",
        'html': '<div>WOW SWAG</div>'
    }
    var post3 = {
        'urlPath': "/hot/in/topeka",
        'html': '<div>JEEZ LOUISE</div>'
    }
    
    testCache.cachePost(post1.urlPath, post1.html);
    testCache.cachePost(post2.urlPath, post2.html);
    testCache.cachePost(post3.urlPath, post3.html);
    
    console.log(testCache);
    
    console.log(testCache.checkPostCache('super/neat'));
    console.log('--- should say null');
    console.log(testCache.checkPostCache(post1.urlPath));
    console.log('--- should say null');
    console.log(testCache.checkPostCache(post2.urlPath));
    console.log('--- should say wow swag');
    console.log(testCache.checkPostCache(post3.urlPath));
    console.log('--- should say jeez louise');
    
    testCache.flushCache();
    
    console.log(testCache);
    console.log(testCache.checkPostCache('super/neat'));
    
    testCache.cacheBlogroll('<div>THE BLOG</div>');
    console.log(testCache);
    
    console.log('---');
    console.log(testCache.getBlogroll());
    
    
}

//testCase();