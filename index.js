#!/usr/bin/env node --harmony

var fs              = require('fs');
var util            = require('util');
var AjaxRequest     = require('xhr2');
var async           = require('async');

module.exports = function Sitemap(siteURL, siteDistPath) {

  if(!siteDistPath){
    siteDistPath = "/";
  }

  this.pages   = [];
  this.sitemap = 1;
  this.robots  = [];

  this.searchEngines = [
    {name:"Google", URL: "www.google.com"},
    {name:"Bing", URL: "www.bing.com"}
  ];

  this.add = function(url, changeFreq, priority) {

    if(!changeFreq){
      changeFreq = "Daily";
    }

    if(!priority){
      priority = "0.5";
    }

    this.pages.push({
      url: url,
      changeFreq: changeFreq,
      priority: priority
    });

    if (this.pages.length >= 50000) {
      this.flush();
    }
  },
  this.flush = function(callback) {
    util.log('Flushing sitemap #' + this.sitemap + ' to disk');

    var xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ].join('');

    this.pages.forEach(function(page) {
      xml += [
        '<url>',
          '<loc>' + page.url + '</loc>',
          '<changefreq>' + page.changeFreq + '</changefreq>',
          '<priority>' + page.priority + '</priority>',
        '</url>',
      ].join('');
    });

    xml += '</urlset>';

    var filename = '/sitemap-';

    if (this.sitemap < 10) {
      filename += '0';
    }

    filename += this.sitemap + '.xml';

    fs.writeFileSync(siteDistPath + filename, xml);

    // Submit sitemap to the search engines

    async.each(this.searchEngines, function(target, callback){
      var req = new AjaxRequest();
      req.onload = function(e){
        if(req.status == "200"){
          util.log("Submitted sitemap to " + target.name);
        } else {
          util.log("Sorry, there was a problem submitting your sitemap to " + target.name);
        }  
        callback();
      }
      req.open("GET", "http://"+target.URL+"/ping?sitemap=http://" + siteURL + "/" + filename, true);
      req.send();
    }, function(){
      if(callback){
        callback();
      }
    });

    this.pages = [];
    this.sitemap++;
  }
};
