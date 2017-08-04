const firebase = require('firebase');
const cheerio = require('cheerio');
const request = require('request');
const async = require('async');
var path = require('path');
const cheerioTableparser = require('cheerio-tableparser');

var config = require('./config.js').config
// console.log(config);
var siteUrl = "https://pokemongo.gamepress.gg";
firebase.initializeApp(config);
var database = firebase.database();

var count = 0;

async.during(
    function (callback) {
        // return callback(null, count < 1);
        return callback(null, count < 250);
    },
    function (callback) {
        count++;
        request(siteUrl+'/pokemon/'+count, function (error, response, html) {
            const $ = cheerio.load(response.body);
            cheerioTableparser($);
            console.log(siteUrl+'/pokemon-test/'+count);
            otherArray = fixOtherStats($("#evolution-requirements table").parsetable(false,false,true));
            statsArray = getStatsFromDivArr($(".pokemon-stats>.header-stats>.stat-text"));
            maxCP = $(".max-cp-number").text();
            typeArray = getTypeFromDivArr($('.pokemon-type>div>.taxonomy-term>.content>div>img'));
            fastMoves = getMovesFromDivArray($('.primary-move>div>article'),false);
            chargeMoves = getMovesFromDivArray($('.secondary-move>div>article'),true);

            var pokeData = {
              name: $('.pokemon-image img').attr('alt'),
              number: count,
              image: siteUrl+$('.pokemon-image img').attr('src'),
              type: typeArray,
              maxCP: maxCP,
              stats: statsArray,
              fastMoves: fastMoves,
              chargeMoves: chargeMoves,
              other: otherArray
            }
            // console.log(pokeData);
            pushToDb(count, pokeData, callback);
            // callback();
          });
    },
    function (err) {
      //all done!
      console.log('All Done!');
    }
);

function getTypeFromPath(url) {
  var s = path.parse(url).name;
  return s[0].toUpperCase() + s.substr(1);
}

function getTypeFromDivArr(divs) {
  var types = [];
  for (var i = 0; i < divs.length; i++) {
    types.push(getTypeFromPath(divs[i].attribs.src));
  }
  return types;
}

function getStatsFromDivArr(divs) {
  var stats = {};
  var regex = /([A-Z]+) ([0-9]+)/;
  for (var i = 0; i < divs.length; i++) {
    var full = divs[i].children[0].data.replace(/(\r\n|\n|\r)/gm," ").replace(/\s+/g," ");
    var matched = full.match(regex);
    stats[matched[1]]=matched[2];
  }
  return stats;
}

function getMovesFromDivArray(divs,isCharge) {
  var moves = [];
  // console.log(divs.length);
  var chee = cheerio.load(divs)
  //Typhlosion
  divs.each(function(i, elem) {
    if (isCharge == true) {
      mvData = {
        title: chee(elem).find('.primary-move-title>a>span').text(),
        damage: chee(elem).find('.primary-move-damage>div').text(),
        energy: chee(elem).find('.primary-move-title>div>div>.content>div>img').attr('alt').replace(" Energy",''),
        type: getTypeFromPath(chee(elem).find('.primary-move-type>div>div>div>.content>div>img').attr('src'))
      }
    }else{
      mvData = {
        title: chee(elem).find('.primary-move-title>a>span').text(),
        damage: chee(elem).find('.primary-move-damage>div').text(),
        type: getTypeFromPath(chee(elem).find('.primary-move-type>div>div>div>.content>div>img').attr('src'))
      }
    }

    moves.push(mvData);
  });
  return moves;
}

function fixOtherStats(array) {
  var jsonStruct = {};
  for (var i = 0; i < array[0].length; i++) {
    if (array[0][i]=="Evolvution Requirements") {
      jsonStruct["Evolution Requirements"] = array[1][i].replace(/(\r\n|\n|\r)/gm," ").replace(/\s+/g," ");
    }else{
      jsonStruct[array[0][i]] = array[1][i].replace(/(\r\n|\n|\r)/gm," ").replace(/\s+/g," ");
    }
  }
  return jsonStruct;
}

function pushToDb(id, data, cb) {
  database.ref('pokemon-test/' + id).set(data).then(function () {
      console.log(id + " - " + data.name);
      cb();
    }).catch(function (err) {
      console.log("error - - - - - with id -"+id + err);
    });
}
