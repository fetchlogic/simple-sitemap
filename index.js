#!/usr/bin/env node --harmony

var fs              = require('fs');
var util            = require('util');
var AjaxRequest     = require('xhr2');
var async           = require('async');

/**
 *
 * @param {string} siteURL
 * @param {string} siteDistPath
 * @param {boolean} dryRun
 * @constructor
 */
module.exports = function Sitemap(siteURL, siteDistPath, dryRun) {

  if(!siteDistPath){
    siteDistPath = "/";
  }

  if (!dryRun) {
    dryRun = false;
  }

  this.pages   = [];
  this.sitemapCount = 1;
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
      this._flush();
    }
  },
  // called in the end when all pages are added
  this.flush = function(callback) {

    var lastmod = (new Date()).toISOString();
    this._flush();

    var xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ].join('');

    for (var i = 1; i < this.sitemapCount; i++) {
      var filename = 'sitemap-';
      if (this.sitemapCount < 10) {
        filename += '0';
      }
      filename += i + '.xml';
      xml += [
        '<sitemap>',
        '<loc>' + siteURL + '/' + filename + '</loc>',
        '<lastmod>' + lastmod + '</lastmod>',
        '</sitemap>'
      ].join('');

    }
    xml += '</sitemapindex>';
    util.log('Flushing sitemapindex to disk');
    fs.writeFileSync(siteDistPath + '/sitemapindex.xml', xml);

    if (true === dryRun) {
      if(callback){
        callback();
      }
      return;
    }

    // Submit sitemapindex to the search engines

    async.each(this.searchEngines, function(target, callback){
      var req = new AjaxRequest();
      req.onload = function(e){
        if(req.status == "200"){
          util.log("Submitted sitemapindex to " + target.name);
        } else {
          util.log("Sorry, there was a problem submitting your sitemapindex to " + target.name);
        }
        callback();
      }
      req.open("GET", "http://"+target.URL+"/ping?sitemap=http://" + siteURL + "/sitemapindex.xml", true);
      req.send();
    }, function(){
      if(callback){
        callback();
      }
    });
  },


  this._flush = function(callback) {
    util.log('Flushing sitemap #' + this.sitemapCount + ' to disk');

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

    if (this.sitemapCount < 10) {
      filename += '0';
    }

    filename += this.sitemapCount + '.xml';

    fs.writeFileSync(siteDistPath + filename, xml);

    this.pages = [];
    this.sitemapCount++;

  }
};
