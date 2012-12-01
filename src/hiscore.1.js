/*
 * The MIT License
 * 
 * Copyright (c) 2012 Petar Petrov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
 
/**
 * Save hi-scores into localstorage (IndexedDB or WebSQL)
 *
 * TODO: Needs reworking, as db.open() is called too frequently!
 * And also - this Async. impl sucks :(
 */
Hiscore = Backbone.Model.extend({
    defaults: {
        // references
        'storageName': 'RGGame_dc32000e-afd6-481e-8807-4dd838f2d922',
        'version': 1,
        'storageTable': 'hiscore',
        'maxScores': 6,
        'defaultScores': [ 
            {name: 'Raging Hero', score: 168}, 
            {name: 'Kage Bunshin no Jutsu', score: 122}, 
            {name: 'Now we\'re talking', score: 84}, 
            {name: 'Sucks to be you', score: 64}, 
            {name: 'Absolute looser', score: 32},         
            ],
        'board': 'highscores',
    },
    // storage init
    initialize: function() {
       // window.shimIndexedDB && window.shimIndexedDB.__useShim();
    },
    open: function(fnCallback) {
        // ... I know you can, but please don't :(
        Playtomic.Log.View('951587', "b45d8d7a0e6d460b", "b6fefae7617943f3937c883763706d", 
            document.location);
        
    },
    // save score for given person directly to DB
    save: function(who, score, fnCallback) {
        var model = this;
        
        var userScore = {};
        userScore.Name = who;
        userScore.Points = score;
    
        // submit to the highest-is-best table "highscores"
        Playtomic.Leaderboards.Save(userScore, model.get('board'), function(response) {
           if (fnCallback)  {
               console.log(response);
               if (response.Success) {
                   fnCallback(true);
               } else {
                   fnCallback(null);
               }
           }
        },
        {allowduplicates: true}
        ); 
    },
    // get sorted list of top 3 scores 
    getAllScores: function(fnCallback) {
        var model = this;
        
        Playtomic.Leaderboards.List(model.get('board'), function(scores, numscores, response) {
            if(response.Success) {
                console.log(scores.length + " scores returned out of " + numscores);

                // send back
                if (fnCallback) {
                    var result = [];
                    for(var i=0; i<scores.length; i++) {
                        var score = scores[i];
                        result.push({name: score.Name, score: score.Points })
                    }
                    
                    fnCallback(result);
                }
                
            } else {
                // score listing failed because of response.ErrorCode
                if (_Globals.conf.get('debug')) {
                    console.log("Save score failed!")
                    console.log(response);
                }
                
                // flag that something went wrong
                if (fnCallback) {
                    fnCallback(null);
                }
            }
        },
        // OPTIONS
        { 
            //perpage: model.get('maxScores') 
        }); // end List
    },
});


// Show Hiscore Dialog - View/Reset scores
Crafty.bind("ShowSaveHiscore", function(score) {
    
    // show dialog
    $("#dialog-save-score").dialog({
        resizable: false,
        "width": 460,
        "height": 300,
        modal: false,
        "title": "Save Hiscore",
        zIndex: 20,
        buttons: {
            "Yes": function() {
                var name = prompt("Please enter your rabbit name","Babatu");
                if (name != null && name != "") {
                    var hiscore = new Hiscore();
                    //hiscore.open();
                    name = name.replace(/<(?:.|\n)*?>/gm, '');
                    hiscore.save(name, score, function(success) {
                        if (success) {
                            Crafty.trigger('ShowHiscore', {text: undefined, refresh: true});
                        } else {
                            Crafty.trigger('ShowHiscore', {text: 'Sorry, but saving your score failed', refresh: true});
                        }
                    }); 
                }
                $(this).dialog("close");
            },
            "No": function() {
                $(this).dialog("close");
            }            
        },
    });
        
        
});

// Show Hiscore Dialog - View/Reset scores
Crafty.bind("ShowHiscore", function(params) {
    console.log(params);
    
    $("#dialog-score").dialog({
        resizable: false,
        "width": 460,
        "height": 400,
        modal: true,
        "title": "Top 10 Scores",
        open: function() {
            
            if (!params.text) {
                $("#dialog-score").html('<p>Loading hiscores, please wait ...</p>');
                
                var hiscore = new Hiscore();
                //hiscore.open();
                
                // load scores
                //var text = '<div style="position: absolute; top: 0; left: 0;">';
                var text = '<div>';
                text += '<span class="name">';
                text += '[Name]';
                text += '</span>';
                text += '<span class="score">';
                text += '[Carrots]';
                text += '</span>';
                text += '</div>';            
                hiscore.getAllScores(function(scores, server) {
                    var i = 0;
                    _.each(scores, function(obj) {
                        if (++i > 10)
                            return;
                        text += '<div>';
                        text += '<span class="name">';
                        text += i + '. ';
                        text += obj.name;
                        text += '</span>';
                        text += '<span class="score">';
                        text += obj.score;
                        text += '</span>';
                        text += '</div>';
                        
                    });
                    //text += '</div>';
                    
                    $("#dialog-score").html(text);
                    //Crafty.trigger("ShowHiscore", {text: text, refresh: params.refresh});
                });
                return;
            } else {
                $("#dialog-score").html(params.text);
            }  
        },
        buttons: {
            "Refresh Scores": function() {
                $(this).dialog("close");
                Crafty.trigger('ShowHiscore', params);
            },
            "Let me out!": function() {
                if (params.refresh) {
                    // TODO: Cheap! :( Must replace with proper restart.
                    window.location.reload() 
                }                
            }
        },
        close: function(event, ui) {
//            if (params.refresh) {
//                // TODO: Cheap! :( Must replace with proper restart.
//                window.location.reload() 
//            }
        }
    });    
});