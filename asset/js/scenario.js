class scenario {
    constructor(params) {
        var me = this;
        this.conteneur = params.conteneur ? params.conteneur : d3.select("#"+params.idConteneur);
        this.mediaCards = [];
        this.tracks = [];
        this.details = [];
        this.timeliner = params.timeliner ? params.timeliner : false;
        this.dataTime = -1;
        this.resource = params.resource ? params.resource : false;
        this.actant = params.actant ? params.actant : false;
        this.creators = [];
        this.urls = params.urls ? params.urls : false;
        this.mdWait = new jBox('Modal', {
            width: 200,
            height: 100,
            title: 'Patience...',
            content: '<div class="loading">' +
            '<p style="width:150px" >Merci de patienter...</p>' +
            '</div>'
        });
        this.mdEditTrack = new jBox('Modal', {
            width: 480,
            height: 384,
            theme: 'TooltipDark',
            overlay: false,
            title: "Editer l'annotation",
            content: $('#mdEditTrack'),//ATTENTION le formulaire doit être ajouter à la page HTML
            draggable: 'title',
            repositionOnOpen: false,
            repositionOnContent: false,
        });
        this.mdAddLayers = new jBox('Modal', {
            width: 200,
            height: 100,
            title: 'Ajouter des couches',
            width: 480,
            height: 350,
            theme: 'TooltipDark',
            overlay: false,
            content: $('#mdAddLayers'),//ATTENTION le formulaire doit être ajouter à la page HTML
            draggable: 'title',
            repositionOnOpen: false,
            repositionOnContent: false,
            onOpen: function() {
                initSuggestions("choixCategories");
            },        
        });
        this.mdAddScenario = new jBox('Modal', {
            width: 480,
            height: 384,
            theme: 'TooltipDark',
            overlay: false,
            title: "Add scenario",
            content: $('#mdAddScenario'),//ATTENTION le formulaire doit être ajouter à la page HTML
            draggable: 'title',
            repositionOnOpen: false,
            repositionOnContent: false
        });
        this.mdShowMedia = new jBox('Modal', {
            width: 480,
            height: 384,
            theme: 'TooltipDark',
            overlay: false,
            title: "Media",
            content: "",
            draggable: 'title',
            repositionOnOpen: false,
            repositionOnContent: false
        });    

        this.htmlError = '<p>ERREUR !</p>'
        +'<p><i class="fa-solid fa-bug"></i><i class="fa-solid fa-bug"></i><i class="fa-solid fa-bug"></i></p>'
        +'<p>Merci de contacter le responsable</>';
        //liste des propriétés de la tracks qui seront suggérées
        this.sgtProps = params.sgtProps ? params.sgtProps : [];
        //définie si les suggestions sont globales à omeka ou locales au scénario
        this.sgtType = params.sgtType ? params.sgtType : 'globales';
        this.fonctions = params.fonctions ? params.fonctions : [];
        this.scenarios = params.scenarios ? params.scenarios : [];
        this.modeVisuScenario = 'edit';
        this.graphAll = false;
        this.heightEdit = false;
        this.height = false;
        this.width = false;
        this.rtTrack = params.rtTrack ? params.rtTrack : 'Indexation vidéo';
        //détermine la propriété qui identifie les mediaCard
        this.idCard = params.idCard ? params.idCard : 'oa:hasTarget';
        this.mainSvg = false;
        this.script = "";
    
        this.scenarioException = function(value) {
            this.value = value;
            this.message = "Scenario : Error";
            this.toString = function() {
               return this.message + this.value;
            };
        }    
        this.init = function () {
            if(!me.actant || !me.urls)throw new me.scenarioException("Paramètres d'initialisation abscents.");        

            if(!me.conteneur.size() && !me.resource){
                me.mdAddScenario.open();
                d3.select('#btnSccreate').on('click',saveScenario)
                return;        
            }
            getData();
        }

        function getData(){

            //récupère les données du scenario
            me.mdWait.open();
            $.ajax({
                    type: 'POST',
                    dataType: 'json',
                    url: me.urls.gen,
                    data:{'idScenario':me.resource["o:id"],'idActant':me.actant["o:id"]}
            }).done(function (sc) {
                me.script = sc.script;
                $.ajax({
                    type: 'GET',
                    dataType: 'json',
                    url: sc.json
                }).done(function (data) {
                    me.details = data;
                    initIHM();
                })
                .fail(function (e) {
                    throw new me.scenarioException(e);
                })
                .always(function () {
                    me.mdWait.close();
                });
            })
            .fail(function (e) {
                //throw new me.scenarioException(e);
                console.log(e)
            });            

        }

        function addScript(){
            if(!me.script)return;
            //corrige le texte
            me.script = me.script.html.replaceAll('<p>','');
            me.script = me.script.replaceAll('</p>','');
            //ajoute la balise
            let s = document.createElement('script');
            s.type = 'text/javascript';
            try {
                s.appendChild(document.createTextNode(me.script));
                me.conteneur.node().appendChild(s);
            } catch (e) {
                s.text = me.script;
                me.conteneur.node().appendChild(s);
            }
        }
        
        function purgeIHM(){
           //supprime les données d'un scénario précédent
           me.timeliner.hide();
           d3.select("#btnCurrentScenario").text('...');
           d3.select("#gbManipScenario").selectAll('button').style('visibility','hidden');
           d3.select("#gbModeVisuScenario").style('visibility','hidden');        

           let medias = Array.prototype.slice.apply(document.querySelectorAll('audio,video'));
           medias.forEach(m => {
               videojs(m.playerId).dispose();
           });
           me.conteneur.selectAll("script").remove();
           me.conteneur.selectAll("div").remove();
           me.mediaCards=[]; 
           me.tracks=[];
           d3.select('#graphScenario').selectAll('svg').remove();
           me.graphAll = false;

           //initialisation du svg
           createSVG();


        }

        function initIHM(){
            //initialisation du timeliner
            timelinerInit();

            purgeIHM();

            //dimensionne les block
            let main = d3.select('#mainContainer'), mainPosi = main.node().getBoundingClientRect()
            me.heightEdit = window.innerHeight - mainPosi.top - (window.innerHeight / 3)-10;
            me.height = window.innerHeight - mainPosi.top + (window.innerHeight / 3);
            me.width = mainPosi.width;
            //main.style('height',me.height+'px');
            d3.select('#mediaCards').style('height',me.heightEdit+'px');
            //d3.select('#visuScenario').style('height',me.height+'px');          
            //d3.select('#graphScenario').style('height',me.height+'px');          

            //ajoute les script défini dans omeka
            addScript();

            //affiche le titre du scénario courant
            d3.select("#btnCurrentScenario").text(me.resource["o:title"]);
            d3.select("#gbManipScenario").selectAll('button').style('visibility','visible');

            //ajoute les écouteurs d'événement
            d3.select('#btnIMajout').on('click', function (e) {
                me.saveTrack();
            });
            d3.select('#btnIMmodif').on('click', function (e) {
                me.saveTrack(true);
            });
            d3.select('#btnIMdelete').on('click', function (e) {
                let confirm = new jBox('Confirm', {
                    theme: 'TooltipDark',
                    confirmButton: 'Do it!',
                    cancelButton: 'Nope',
                    content:"Do you really want to delete this track ?",
                    confirm:deleteTrack
                });
                confirm.open();
            });
            d3.select('#btnAdminScenario').on('click', function (e) {
                editSource(e,me.resource);
            });

            
            d3.select('#btnAjoutCategory').on('click', function (e) {
                me.addCategory();
            });
            d3.select('#btnSelectCategory').on('click', function (e) {        
                me.selectCategory();
            });
            d3.select('#btnAddLayers').on('click', function (e) {        
                me.addLayers();
            });            
            d3.select('#btnModeVisuScenarioEdit').on('click', function (e) {        
                me.modeVisuScenario = 'edit';
                d3.select('#mediaCards').style('display','flex');
                d3.select('#visuScenario').style('display','none');
                d3.select('#graphScenario').style('display','none');
                timelinerShow();
            });
            d3.select('#btnModeVisuScenarioPlay').on('click', function (e) {        
                me.modeVisuScenario = 'play';
                d3.select('#mediaCards').style('display','none');
                d3.select('#visuScenario').style('display','block');
                d3.select('#graphScenario').style('display','none');
                //me.timeliner.hide();
            });
            d3.select('#btnModeVisuScenarioGraph').on('click', function (e) {        
                me.modeVisuScenario = 'edit';
                d3.select('#mediaCards').style('display','none');
                d3.select('#visuScenario').style('display','none');
                d3.select('#graphScenario').style('display','flex');
                initGraphAll();
                me.timeliner.hide();
            });
            d3.select('#btnDeleteScenario')
                .style('visibility','visible')
                .on('click', function (e) {      
                    let confirm = new jBox('Confirm', {
                        theme: 'TooltipDark',
                        confirmButton: 'Do it!',
                        cancelButton: 'Nope',
                        content:"Do you really want to delete this scenario and all associated tracks ?",
                        confirm:deleteScenario
                    });
                    confirm.open();
                });
            d3.select('#gbModeVisuScenario')
                .style('visibility','visible');
            d3.select('#btnScenarioTxtToObj')
                .style('visibility','visible')
                .on('click', function (e) {      
                    let confirm = new jBox('Confirm', {
                        theme: 'TooltipDark',
                        confirmButton: 'Do it!',
                        cancelButton: 'Nope',
                        content:"Do you really want to transform text to object ?",
                        confirm:scenarioTextToObject
                    });
                    confirm.open();
                });                           

            me.timeliner.load(me.details);    
            timelinerShow();
            getCreators();
            me.setCurrentTime(0);

        }        


        function createSVG(){


            let main = d3.select('#mainContainer'), mainPosi = main.node().getBoundingClientRect()
            me.heightEdit = window.innerHeight - mainPosi.top - (window.innerHeight / 3)-10;
            me.height = window.innerHeight - mainPosi.top + (window.innerHeight / 3);
            me.width = mainPosi.width;


            let cont = d3.select('#visuScenario'), posi = d3.select('#mainContainer').node().getBoundingClientRect();
            cont.select('svg').remove();    
            let svg = cont.append("svg")
                .attr("width", posi.width+'px')
                .attr("height", window.innerHeight - posi.top+'px');
            me.mainSvg = svg.append("g");   
            svg.call(
                d3.zoom()
                    .scaleExtent([.1, 4])
                    .on("zoom", function(event) { me.mainSvg.attr("transform", event.transform); })
            );                
        
        };
        

        function showSVG(){
            let medias =  me.tracks.filter(i => i.a == 'c' || i.a == 'u')
            , fsTxt = 24;
            //gestion des medias
            me.mainSvg.selectAll("g").data(medias)
                .join(
                    enter => {
                        let g = enter.append("g")
                            .attr('class','trackCreate trackVisible');
                        //gestion des medias
                        joinImage(g);
                        joinSound(g);
                        //ajoute les textes
                        g.append("text")
                            .text(d=>getMediaText(d))
                            .attr('class','textVisible')
                            .attr("fill", (d)=>{ 
                                return 'black'; 
                            })
                            .attr("y",(d,i)=>{ 
                                return (i+1)*fsTxt; 
                            })
                            .attr("font-family", "Arial")
                            .attr("font-size", fsTxt)
                            .style("pointer-events", "none");
                    },
                    update => {
                        update
                            .attr('class','trackUpdate trackVisible')                        
                            .select('text').text(d=>getMediaText(d));
                        joinImage(update); 
                        joinSound(update)               
                    },
                    exit => {
                        exit.remove();
                        stopSound(exit);
                    }
                );
            
        };        
        function stopSound(slt){
            let audios = [];
            slt.each(d=>{
                if(d.p.value.entry["oa:hasTarget"] 
                    && isTypeAudio(d.p.value.entry["oa:hasTarget"][0]["o:media_type"]))
                    audios.push(d.p.value.entry); 
            })
            audios.forEach(a=>{
                let n=d3.select('#idTarget'+a["oa:hasTarget"][0]["o:id"]).node();
                n.pause();
                console.log('stopSound : '+a["oa:hasTarget"][0]["o:id"]);
            });        
        }
        function joinSound(slt){
            let audios = [];
            slt.each(d=>{
                if(d.p.value.entry["oa:hasTarget"] 
                    && isTypeAudio(d.p.value.entry["oa:hasTarget"][0]["o:media_type"]))
                    audios.push(d.p.value.entry); 
            })
            if(!audios.length)return;
            d3.select('#visuScenario').selectAll('audio').data(audios).join(
                enter => {
                    enter.append("audio")
                        .attr('class',d=>'idSource'+d["oa:hasSource"][0]["o:id"]+' audioEnter')
                        .attr("id",d=>{
                            d.idAudio = 'idTarget'+d["oa:hasTarget"][0]["o:id"];
                            d.currentTime = me.timeliner.currentTimeStore.value-d.start;
                            return d.idAudio;
                       })
                        .attr("controls",true)
                        .attr('src',d=>d["oa:hasTarget"][0]["o:original_url"])
                        .html("Votre navigateur ne supporte pas l'élément <code>audio</code>.")
                        .on('loadeddata', function(e,d){
                            if(this.readyState >= 2){
                                d.audioReady = true;
                                this.play();
                                this.pause();
                            } 
                          });
                },
                update => {
                    update
                    .attr('class',d=>'idSource'+d["oa:hasSource"][0]["o:id"]+' audioUpdate')
                    .attr("id",d=>{
                        d.idAudio = 'idTarget'+d["oa:hasTarget"][0]["o:id"];
                        d.currentTime = me.timeliner.currentTimeStore.value-d.start;
                        return d.idAudio;
                       });
                },
                /*
                exit => {
                    exit.remove();
                }
                */
            );    
        }
        
        function joinImage(g){
            let wImg = 200;
            g.selectAll('image').data((d,i)=>
                    d.p.value.entry["oa:hasTarget"] ? 
                    d.p.value.entry["oa:hasTarget"].filter(t=>isTypeImage(t["o:media_type"])).map(img=>{
                        return {'i':i,'img':img,'idSource':d.p.value.entry["oa:hasSource"][0]["o:id"]};
                    })
                    : [] 
                )
            .join(
                enter=>{
                    enter.append("image")
                    .attr('class',d=>'idSource'+d.idSource+' joinImageEnter')
                    .attr('href',d=>d.img.thumbnail_display_urls.medium)
                    .attr('style',(d,i)=> d.style = d.style ? d.style : "x:"+((i+d.i)*wImg)+";width:"+wImg+"px;");
                    //.attr('x',(d,i)=>(i+d.i)*wImg)
                    //.attr('width',"200");
                },
                update=>{
                    update
                        .attr('class',d=>'idSource'+d.idSource+' joinImageUpdate')
                        .attr('href',d=>d.img.thumbnail_display_urls.medium)
                        .attr('style',(d,i)=> d.style = d.style ? d.style : "x:"+((i+d.i)*wImg*2)+";width:"+wImg+"px;");
                    },
                exit=>{
                    exit.remove();
                }
            )
        }
        
        function isTypeImage(type){
            return ['image/bmp',
            'image/gif',
            'image/jp2',
            'image/jpeg',
            'image/pjpeg',
            'image/png',
            'image/tiff',
            'image/x-icon'].includes(type);
        }
        function isTypeAudio(type){
            return ['audio/midi',
            'audio/mp4',
            'audio/mpeg',
            'audio/ogg',
            'audio/x-aac',
            'audio/x-aiff',
            'audio/x-ms-wma',
            'audio/x-ms-wax',
            'audio/x-realaudio',
            'audio/x-wav'].includes(type);
        }
        
        function getMediaText(m){
            return m.p.text;
        }        

        function initGraphAll(){
            //constructions des datas;
            let dt = getDataReseau(me.timeliner.getAllEntry().filter(e=>e.timeEnd),false,false,true);
            if(!me.graphAll){
                me.graphAll = new reseau({'cont':d3.select('#graphScenario')
                    ,'width':me.width,'height':me.height
                    ,'legende':true
                    ,'data':dt
                });
            }me.graphAll.update(dt);
        }

        function getCreators() {
            let dbl =[];
            me.creators = []
            me.details.layers.forEach(l=>{
                l.values.forEach(v=>{
                    if(v["dcterms:creator"] && dbl[v["dcterms:creator"][0]["o:id"]] === undefined){
                        me.creators.push(v["dcterms:creator"][0]);
                        dbl[v["dcterms:creator"][0]["o:id"]]=1;
                    }
                });
            });
        }
        
        //ajoute les suggestions possible dans la fenêtre d'édition des tracks
        function initSuggestions(idCont){
            let sgtRela=d3.select("#"+idCont);

            if(!sgtRela.size()){
                console.log("PAS DE SUGGESTIONS");
                return;
            }

            sgtRela.selectAll('div').remove();
            let mainDiv = sgtRela.selectAll('div').data(me.sgtProps).enter().append('div').attr('class',"col-12");
            let nav = mainDiv.append('nav').attr('class',"navbar")
                .append('div').attr('class',"container mb-1").style('padding',0);
            nav.append('span').html(p=>p.p['o:label']);
            let dl = nav.append('div').attr('class','d-flex');
            dl.append('div').attr('id',p=>idCont+'choix'+p.p['o:local_name'])
                .append('input').attr('class',"typeahead").attr('type','text').attr('placeholder',p=>'Choisir / ajouter...');
            dl.append('button').attr('id',p=>idCont+'btnChoix'+p.p['o:local_name'])
                .attr('class',"btn btn-sm btn-danger ml-1")
                .style('display','none')
                .html('+');
            mainDiv.append('ul').attr('id',p=>idCont+'choose'+p.p['o:local_name'])
                .attr("class","list-group list-group-horizontal");  
            mainDiv.append('ul').attr('id',p=>idCont+'add'+p.p['o:local_name'])
                .attr("class","list-group list-group-horizontal");  
        
            me.sgtProps.forEach((p,ip)=>{
                let className =p.p['o:local_name'];
                p.relations = [];
                p.sgt = new Bloodhound({
                    datumTokenizer: Bloodhound.tokenizers.obj.whitespace('o:title'),
                    queryTokenizer: Bloodhound.tokenizers.whitespace,
                    identify: function(obj) { 
                        return obj['o:id']; 
                      },
                    local: me.sgtType == 'locales' ? getSuggestionsData(p.c) : false,
                    remote: me.sgtType == 'locales' ? {url: p.url,wildcard: '%QUERY'} : false,                    
                    //initialize: false,
                  });
                var promise = p.sgt.initialize();
                promise
                  .done(function() { 
                      console.log('ready to go!'); })
                  .fail(function() { 
                      console.log('err, something went wrong :('); });
        
                $('#'+idCont+'choix'+className+' .typeahead').typeahead(null, {
                name: 'omk-'+className,
                display: 'o:title',
                source: p.sgt,
                templates: {
                    empty: function(context){
                        d3.select('#'+idCont+'btnChoix'+p.p['o:local_name']).style('display','block');
                        p.relations.push(context.query);
                        createRelationToString(idCont, p);                        
                        return [
                            '<div class="empty-message">',
                                'ajouter : '+context.query,
                            '</div>'
                            ].join('\n')
                    },
                    suggestion: Handlebars.compile('<div><strong>{{o:title}}</strong> – {{o:id}}</div>')
                }  
                });
                $('#'+idCont+'choix'+className+' .typeahead').bind('typeahead:select', function(ev, d) {        
                    d3.select('#'+idCont+'btnChoix'+p.p['o:local_name']).style('display','none');
                    p.relations.push(d);
                    createRelationToItem(idCont, p);
                })        
            })      
        }

        function getSuggestionsData(c){
            let layers = me.timeliner.getLayers().filter(l=>{
                if(l.class)
                    return l.class["o:term"]==c['o:term'];
                if(l.id){
                    let ids = l.id.split(':');
                    return ids[ids.length-1]==c['o:id'];
                } 
                return false;
            });
            return layers.map(l=>l.source);
        }      

        function saveScenario() {
            me.mdAddScenario.close();
            me.mdWait.open();
            //récupère les données saisies
            let dataScena = {
                'dcterms:title': document.getElementById('inputSctitre').value,
                'dcterms:description': document.getElementById('inputScdesc').value,
                'dcterms:creator': actant['o:id'],
                'item_id':[]
            }
            //récupère la source de génération
            //seminairesToScenario.forEach(s=>dataScena['item_id'].push(s['o:id']));
            //enregistre dans la base
            $.ajax({
                    type: 'POST',
                    dataType: 'json',
                    url: me.urls.crea,
                    data: dataScena
                }).done(function (data) {
                    me.scenarios.push(data);
                    if(me.fonctions.showListeScenario)me.fonctions.showListeScenario();  
                    if(me.fonctions.chargeScenario)me.fonctions.chargeScenario(null, data);
                })
                .fail(function (e) {
                    console.log(e);
                })
                .always(function () {
                    me.mdWait.close();
                });
        }
        function deleteScenario(e) {
            me.mdWait.open();
            $.ajax({
                type: 'GET',
                dataType: 'json',
                url: me.urls.del + me.details['idScenario'],
            }).done(function (data) {
                if(!data['error']){
                    purgeIHM();                    
                    let i = me.scenarios.map(s => s['o:id']).indexOf(me.details['idScenario']);
                    me.scenarios.splice(i, 1);
                    if(me.fonctions.showListeScenario)me.fonctions.showListeScenario();  
                }else{
                    me.mdWait.close();
                    throw new me.scenarioException("Suppression du scénario impossible.",data['error']);
                } 
                new jBox('Notice', {
                    content: data['message'],
                    color: 'black',
                    position: {
                        y: 'center',
                        x: 'center'
                    }
                });        
            })
            .fail(function (e) {
                me.mdWait.close();
                throw new me.scenarioException("Suppression du scénario impossible.",e);
            })
            .always(function () {
                me.mdWait.close();
            });
        }        
        function scenarioTextToObject(e) {
            me.mdWait.open();
            $.ajax({
                type: 'POST',
                dataType: 'json',
                url: me.urls.txtToObj,
                data:{'idScenario':me.resource["o:id"],'idActant':me.actant["o:id"]}
            }).done(function (data) {
                if(!data['error']){
                    getData()
                }else{
                    me.mdWait.close();
                    throw new me.scenarioException("Modification du scénario impossible.",data['error']);
                } 
                new jBox('Notice', {
                    content: data['message'],
                    color: 'black',
                    position: {
                        y: 'center',
                        x: 'center'
                    }
                });        
            })
            .fail(function (e) {
                me.mdWait.close();
                throw new me.scenarioException("Modification du scénario impossible.",e);
            })
            .always(function () {
                me.mdWait.close();
            });
        }        

        function createRelationToItem(idcont, p,d){        
            let className = p.p['o:local_name'];
            d3.select('#'+idcont+'choose'+className).selectAll('li').remove();
            let lis = d3.select('#'+idcont+'choose'+className).selectAll('li').data(p.relations.filter(r=>r['o:id'])).enter()
                .append('li').attr('class',"list-group-item").attr('id',r=>className+'_'+r['o:id'])
                .html(r=>r['o:title']);
            lis.append('button').attr('class',"btn btn-danger btn-sm mx-2")
                    .html('X')
                    .on('click',(e,d)=>{
                        let i = p.relations.filter(r=>r['o:id']).map(r => r['o:id']).indexOf(d['o:id']);
                        p.relations.splice(i, 1);
                        createRelationToItem(idCont, p);
                    });
            lis.each(function(r, i) {
                if(r["@type"][1]=="genstory:evenement" && r["genstory:hasFonction"]) createFunctionParam(p.p, r, d)
            });
                
        }

        function createRelationToString(idcont, p){        
            let className = p.p['o:local_name'];
            d3.select('#'+idcont+'add'+className).selectAll('li').remove();
            let lis = d3.select('#'+idcont+'add'+className).selectAll('li').data(p.relations.filter(r=>!r['o:id'])).enter()
                .append('li').attr('class',"list-group-item").attr('id',(r,i)=>className+'_s_'+i)
                .html(r=>r);
            lis.append('button').attr('class',"btn btn-danger btn-sm mx-2")
                    .html('X')
                    .on('click',(e,d)=>{
                        let i = p.relations.filter(r=>!r['o:id']).map(r => r).indexOf(d);
                        p.relations.splice(i, 1);
                        createRelationToString(idcont, p);
                    });                
        }


        function createFunctionParam(p, r, d){
            let li = d3.select('#'+p['o:local_name']+'_'+r['o:id']);
            li.append('p').html(r["genstory:hasFonction"][0]["@value"]);
            //ajoute le formulaire des propriétés
            let params = li.selectAll('div').data(r["genstory:hasParam"]).enter()
                .append('div').attr('class',"input-group flex-nowrap");
            params.append('span').attr('class','input-group-text').attr('id',(rp,i)=>'param_'+r['o:id']+'_'+i)
                .html(rp=>rp["@value"]);
            params.append('input').attr('class','form-control').attr('type','text')
                .attr('placeholder',rp=>rp.property_label+':'+rp["@value"])
                .attr('aria-label',rp=>rp.property_label+':'+rp["@value"])
                .attr('aria-describedby',(rp,i)=>'param_'+r['o:id']+'_'+i)
                .attr('id',(rp,i)=>{
                    rp.id='value_'+r['o:id']+'_'+i;
                    return rp.id;
                })
                .on('change',(e,rp)=>rp.value=e.currentTarget.value)
                .each((rp,i)=>getValueInRelation(rp,d,i));
        }      
        function getValueInRelation(rp,d,i){
            if(d===undefined)return;
            let v = '', ipt = d3.select('#'+rp.id);
            //vérifie si les paramètre ont déjà été saisie
            if(d['genstory:hasParam'] && d['genstory:hasParam'][i]){
                if(d['genstory:hasParam'][i]['o:id']){
                    rp['o:id']=d['genstory:hasParam'][i]['o:id'];
                    v=d['genstory:hasParam'][i]['o:title'];            
                    ipt.attr('disabled',true);
                }else{
                    v=rp.value=d['genstory:hasParam'][i];                     
                }             
            }else if(d['genstory:has'+rp["@value"]]){
                rp['o:id']=d['genstory:has'+rp["@value"]][0]['o:id'];
                v=d['genstory:has'+rp["@value"]][0]['o:title'];        
                ipt.attr('disabled',true);
            }
            ipt.node().value=v; 
        }
        

        function getDataReseau(dataTracks, catAsLink=false, showCreator=true, showRela=false){
            //récupère le reseau de la branche du concept
            let dataReseau = {'nodes':[],'links':[]}, dbl = {};
            dataTracks.forEach(dt=>{
                if(dt.a != 'd'){
                    let e = dt.p ? dt.p.value.entry : dt;
                    let cat = e.category.split(' : ')[0];
                    if(e.idLayer===undefined)e.idLayer = dt.p ? dt.p.value.idLayer : 'no';
                    if(e.idEntry===undefined)e.idEntry = dt.p ? dt.p.value.idEntry : 'no';
                    if(showCreator && dbl[e["dcterms:creator"][0]["o:id"]]===undefined){
                        //ajoute le createur
                        dataReseau['nodes'].push({id: e["dcterms:creator"][0]["o:id"], size: 1
                            , txtColor: 1
                            , group: 'creator'
                            , size: 5
                            , fct: false
                            , title: e["dcterms:creator"][0]["o:title"]
                        }); 
                        dbl[e["dcterms:creator"][0]["o:id"]]=1;
                    }
                    //prendre uniquement les ressource liées
                    if(showRela){
                        sgtProps.forEach(p=>{
                            if(e[p.p["o:term"]] && p.p["o:term"]!="dcterms:creator"){
                                e[p.p["o:term"]].forEach(v=>{
                                    if(dbl[v['o:id']]===undefined){
                                        //ajoute le layer
                                        let group = Array.isArray(v["@type"]) ? v["@type"][v["@type"].length-1] : v["@type"];
                                        group = v['o:id'] == e.idCat ? p.p["o:term"] : group;
                                        dataReseau['nodes'].push({id: v['o:id'], size: 1
                                            , txtColor: e._color
                                            , group: group
                                            , size: 5
                                            , fct: false
                                            , title: v['o:title']
                                        }); 
                                        dbl[v['o:id']]={'nb':1,'i':dataReseau['nodes'].length-1};
                                    }else dbl[v['o:id']].nb++;
                                    //ajoute les liens vers la category
                                    if(v['o:id'] != e.idCat){
                                        if(dbl[v['o:id']+'_'+e.idCat]===undefined){
                                            dataReseau['links'].push({target: v['o:id']
                                            , source: e.idCat, value: 1
                                            , txtColor: e._color
                                            , size: 5
                                            , id : v['o:id']+'_'+e.idCat
                                            , group: p.p["o:label"]});  
                                            dbl[v['o:id']+'_'+e.idCat]={'nb':1,'i':dataReseau['links'].length-1};
                                        }else dbl[v['o:id']+'_'+e.idCat].nb++;
                                    }
                                })    
                            }
                        }) 
                        //met à jour la taille des noeud et des liens
                        for (const i in dbl) {
                            if(i.includes('_')){
                                dataReseau['links'][dbl[i].i].size=5*dbl[i].nb;
                            }else{
                                dataReseau['nodes'][dbl[i].i].size=5*dbl[i].nb;
                            }
                        }   
                    }else{
                        //prendre toutes les choix
                        if(!catAsLink && dbl[e.idCat]===undefined){
                            //ajoute le layer
                            dataReseau['nodes'].push({id: e.idCat, size: 1
                                , txtColor: 10
                                , group: 'category'
                                , size: 5
                                , fct: false
                                , title: cat
                            }); 
                            dbl[e.idCat]=1;
                        }else dbl[e.idCat]++;
                        if(dbl[e.idObj]===undefined){
                            //ajoute le text
                            dataReseau['nodes'].push({id: e.idObj, size: 1
                                , group: cat
                                , size: 5
                                , entry: e
                                , color:e._color
                                , fct: {'click':me.editTrack}
                                , title: e.text
                            }); 
                            dbl[e.idObj]=1;
                        }else dbl[e.idObj]++;
                        //ajoute les liens 
                        if(showCreator && dbl[e.idObj+'_'+e["dcterms:creator"][0]["o:id"]]===undefined){
                            dataReseau['links'].push({target: e.idObj
                            , source: e["dcterms:creator"][0]["o:id"], value: 1
                            , txtColor: 1
                            , id : e.idObj+'_'+e["dcterms:creator"][0]["o:id"]
                            , group: "a comme "+e.category.split(' : ')[0]});  
                            dbl[e.idObj+'_'+e["dcterms:creator"][0]["o:id"]]=1;
                        }
                        if(!catAsLink && dbl[e.idObj+'_'+e.idCat]===undefined){
                            dataReseau['links'].push({target: e.idObj
                            , source: e.idCat, value: 1
                            , txtColor: 1
                            , id : e.idObj+'_'+e.idCat
                            , group: "branche"});  
                            dbl[e.idObj+'_'+e.idCat]=1;
                        } 

                    }
                }
            });
            return dataReseau;
        }

        function timelinerInit(){
            if(!me.timeliner){
                me.timeliner = new Timeliner({});    
                me.timeliner.hide();
                me.timeliner.fctKeyframe = me.addKeyframe;
                me.timeliner.fctKeyframeMove = me.changeKeyframe;
                me.timeliner.fctAddLayer = me.addLayer;
                //me.timeliner.fctTargetNotify = me.targetNotify;
                me.timeliner.fctCurrentTimeChange = me.setCurrentTime;
                me.timeliner.fctPause = me.timelinerPause;
                me.timeliner.fctPlay = me.timelinerPlay;
                me.timeliner.fctDeleteLayer = me.deleteLayer;    
            }
        }
        function timelinerShow(){
            me.timeliner.show('dock-bottom-sam');            
        }        
        this.addKeyframe = function(l, v, o) {
            let ids = l.id.split(':');
            let idCat = l.id.split('_')[0];
            me.editTrack(null,null, {
                'idCat': idCat,
                'idEntry': v,
                'idCreator':actant["o:id"],
                'category': l.name,
                'idGroup': l.id,
                'oa:hasScope': [{'o:id':ids[1]}],
                'oa:hasSource': [{'o:id':ids[3]}],        
                'idLayer':l.idLayer,    
                'text': "--",
                'desc': '--',
                'time': o.time,
                'timeEnd': o.time + 5,
                '_color': o._color,
                'tween': 'linear' //par defaut le tween est linear pour automatiquement mettre une plage de couleur
            })
        }
        this.changeKeyframe = function(l,v){   
            let entry = v.object;
            if(!entry.idObj){
                let te = entry.time;
                entry = l.values[v.index-1];
                entry.idEntry=v.index-1;
                entry.idLayer=v.object.idLayer;
                entry.timeEnd = te;
            }
            me.editTrack(null, null, entry);
        }
        this.addLayer = function(cb){
            if(!me.actant){
                new jBox('Notice', {
                    content: "Vous n'avez pas le droit de créer une couche",
                    color: 'black',
                    position: {
                        y: 'center',
                        x: 'center'
                    }
                });
            }else me.mdAddLayers.open();
        }


        this.selectCategory=function(){
            let idGroup = document.getElementById('ajoutLayerIdCat').value;
            let lblLayer = document.getElementById('ajoutLayerLblCat').value;
            idGroup += '_'+actant['o:id'];
            lblLayer += ' : '+actant['o:title'];
            me.timeliner.addLayer(lblLayer,idGroup);
            me.timeliner.repaintAll();
            me.mdAddLayer.close();
        }
        this.addCategory = function(){
            let layerTitle = document.getElementById('ajoutLayerLblCat').value;
            let layerDesc = document.getElementById('ajoutLayerDescCategory').value;
            //enregistre dans la base
            $.ajax({
                type: 'POST',
                dataType: 'json',
                url: urlSite + '/page/ajax?helper=Scenario&type=addCategory&json=1',
                data: {'dcterms:title':layerTitle,
                'dcterms:description':layerDesc,
                'rt':'Catégorie indexation vidéo'}
            }).done(function (data) {
                me.timeliner.addLayer(data['o:title']+' : '+me.actant['o:title'],data['o:id']+'_'+me.actant['o:id']);
                me.timeliner.repaintAll();
            })
            .fail(function (e) {
                new jBox('Notice', {
                    content: me.htmlError,
                    color: 'black',
                    position: {
                        y: 'center',
                        x: 'center'
                    }
                });
                throw new me.scenarioException("Erreur ajout catagory.",e);

            })
            .always(function () {
                me.mdAddLayers.close();
            });
        }
        this.addLayers = function(){

            //récupère les datas
            let dataLayers = {}, bAdd=false;
            sgtProps.forEach(p=>{
                dataLayers[p.p['o:term']]={
                    'c':p.c['o:term'],
                    'rela' : p.relations.map(r=>{ 
                        bAdd = true;
                        return r['o:id'] ? {'id':r['o:id']} : r ; }
                    )
                };
            })
            if(!bAdd){
                new jBox('Notice', {
                    content: 'Merci de saisir au moins une donnée',
                    color: 'black',
                    position: {
                        y: 'center',
                        x: 'center'
                    }
                });
                return false;
            }
            let dataTrack = {
                'dcterms:creator': actant['o:id'],
                'idScenario': me.details.idScenario,
                'scope': 'addLayer',
                'rt':me.rtTrack,
            }


            //enregistre dans la base
            $.ajax({
                type: 'POST',
                dataType: 'json',
                url: me.urls.addLayers+'&idScenario='+me.details.idScenario,
                data: {'layers':dataLayers,'track':dataTrack}
            }).done(function (data) {
                if(data.error){
                    new jBox('Notice', {
                        title:data.error,
                        content: data.message,
                        color: 'black',
                        position: {
                            y: 'center',
                            x: 'center'
                        }
                    });    
                }else{
                    let messages = "";
                    data.forEach(l=>{
                        messages +=l.message+"<br/>";
                        if(l.track)setLayer(l.track);
                    })
                    new jBox('Notice', {
                        title:"Résultat(s) de l'ajout",
                        content: messages,
                        color: 'black',
                        position: {
                            y: 'center',
                            x: 'center'
                        }
                    });    
                    me.timeliner.repaintAll();    
                }
            })
            .fail(function (e) {
                new jBox('Notice', {
                    content: me.htmlError,
                    color: 'black',
                    position: {
                        y: 'center',
                        x: 'center'
                    }
                });
                throw new me.scenarioException("Erreur ajout layers.",e);

            })
            .always(function () {
                me.mdAddLayers.close();
            });
        }

        this.setCurrentTime = function(t, st){
            //initialise les cards une fois par seconde
            if(t > me.dataTime){
                //cache toutes les card
                me.mediaCards.forEach(mc=>mc.cardCont.style('display','none'));
            }
            me.dataTime = t;

            //selectionne les médias
            getMediaTracks();
            //ordonne les tracks 
            me.tracks =  d3.sort(me.tracks.filter(i => i.a == 'c' || i.a == 'u'),d => d.p.value.entry.ordre)
            //affiche le svg
            showSVG();
            me.tracks.forEach(t=>{              
            //layer.value.forEach(v=>{
                let v = t.p.value;
                //met à jour les infos de la valeur
                if(v.idObj && v.entry[me.idCard]){
                    let idCard = v.entry[me.idCard][0]["o:id"];
                    showMedias(me.mediaCards[idCard]);
                    //modifie le detail
                    showDetails(me.mediaCards[idCard]);
                    //modifie le tagcloud
                    //mediaCards[idTarget].tc.update(data.map(t=>t.p.text));  
                    //modifie la liste des tracks            
                    showListeTracks(me.mediaCards[idCard])
                    //modifie le réseau                    
                    if(me.mediaCards[idCard].r)me.mediaCards[idCard].r.update(getDataReseau(me.mediaCards[idCard].tracks));
                    //execute les fonctions
                    exeFonction(v.entry);
                    me.dataTime = me.timeliner.currentTimeStore.value;
                }
            });

        }

        this.targetNotify = function(layer){
            //initialise les cards une fois par seconde
            if(me.timeliner.currentTimeStore.value != me.dataTime){
                //cache toutes les card
                me.mediaCards.forEach(mc=>mc.cardCont.style('display','none'));
            }
            if(layer===undefined)return;

            //selectionne les médias
            getMediaTracks();
            //ordonne les tracks 
            me.tracks =  d3.sort(me.tracks,d => d.p.value.entry.ordre);
            //affiche le svg
            showSVG();
            me.tracks.forEach(t=>{              
            //layer.value.forEach(v=>{
                let v = t.p.value;
                //met à jour les infos de la valeur
                if(v.idObj && v.entry[me.idCard]){
                    let idCard = v.entry[me.idCard][0]["o:id"];
                    showMedias(me.mediaCards[idCard]);
                    //modifie le detail
                    showDetails(me.mediaCards[idCard]);
                    //modifie le tagcloud
                    //mediaCards[idTarget].tc.update(data.map(t=>t.p.text));  
                    //modifie la liste des tracks            
                    showListeTracks(me.mediaCards[idCard])
                    //modifie le réseau                    
                    if(me.mediaCards[idCard].r)me.mediaCards[idCard].r.update(getDataReseau(me.mediaCards[idCard].tracks));
                    //execute les fonctions
                    exeFonction(v.entry);
                    me.dataTime = me.timeliner.currentTimeStore.value;
                }
            });
        }

        function exeFonction(e) {
            if(e["genstory:hasFonction"]===undefined)return;
            if(!e.exeFonction) e.exeFonction={};
            e["genstory:hasFonction"].forEach(f=>{
                //construction de l'instruction
                let strEval = f+"(";
                if(e["genstory:hasParam"]){
                    e["genstory:hasParam"].forEach(p=>{
                        switch (p) {
                            case "allTracks":
                                //récupère les éléments des targets en cours
                                strEval+='d3.selectAll(".trackVisible")';                            
                                break;
                            case "thisTrackRelations":
                                //construction de la requête à partir des relations de la track
                                let q="";
                                getTrackRelations(e).forEach(r=>q+='.idSource'+r['o:id']+',');// , = OR 
                                q = q.slice(0,-1);
                                strEval+='d3.selectAll("'+q+'")';                            
                                break;
                            case "thisTextTargets":                    
                                //récupère les textes des targets en cours
                                strEval+='d3.selectAll(".textVisible")';                            
                                break;
                            default:
                                if(typeof p === 'object'){
                                    strEval+='d3.selectAll(".idSource'+p['o:id']+'")';                            
                                }else strEval+='"'+p+'"';                            
                                break;
                        }
                        strEval+=',';
                    })    
                    strEval = strEval.slice(0,-1);
                }
                strEval += ')';
                try {
                    if(e.exeFonction[f]){
                        console.log('EVAL DEJA FAIT: '+strEval);
                    }
                    //else{
                        eval(strEval);
                        console.log('EVAL : '+strEval);                
                        e.exeFonction[f]=strEval;    
                    //}                
                } catch (e) {
                    console.log('ERROR : '+strEval,e);                
                }
            })
        }


        function getTrackRelations(e){
            let rs = [];
            me.sgtProps.forEach(p=>{
                if(e[p.p['o:term']]){
                    rs =  rs.concat(e[p.p['o:term']]);                    
                }
            })
            return rs;
        }

        function getMediaTracks(idCard) {

            let objects = me.timeliner.getObjetActions();
            me.tracks.forEach(v => v.a = 'd');

            for (const o in objects) {
                let oa = objects[o];
                for (const a in oa.actions) {
                    let p = oa.actions[a];
                    switch (p.prop) {
                        case 'Choice':
                        case 'omk_videoIndex':
                        case 'TrackAction':
                            joinMediaTrack(o, p);
                            break;
                    }
                }
            }
        }
        
        function joinMediaTrack(id, p) {
            if (me.tracks[id]){
                me.tracks[id].p = p;
                me.tracks[id].a = 'u';
            } else {
                me.tracks[id]={'p':p,'a':'c'};
                //vérifie s'il faut créer le média
                let idCard = p.value.entry[me.idCard][0]["o:id"];
                if (!me.mediaCards[idCard]) createMediaCard(me.tracks[id]);
                me.mediaCards[idCard].tracks.push(me.tracks[id]);
            }
        }
        

        function createMediaCard(track) {

            switch (me.fonctions.createMediaCard) {
                case 'GenStory':
                    createMediaCardGenStory(track)
                    break;           
                default:
                    createMediaCardEdicem(track)
                    break;
            }        
        }
        
        function createMediaCardEdicem(track) {

            let m = {}, d = track.p.value.entry;
            m.card = d3.select("#mediaCards").append("div")
                .attr('id', 'cardVideo' + d["oa:hasTarget"][0]["o:id"])
                .attr("class", "card text-white bg-dark");
        
            //carte = tracks à gauche + vidéo à droite
            let rowCard = m.card.append('div').attr('class', 'row g-0');
            let colAnno = rowCard.append('div').attr('class', 'col-md-6');
            m.idBody = "cardBody"+d["oa:hasTarget"][0]["o:id"];
            m.body = colAnno.append('div')
                .attr("id", m.idBody)
                .attr("class", "card-body");
            let colVideo = rowCard.append('div').attr('class', 'col-md-6');
            colVideo.append('h5').html(d["oa:hasTarget"][0]["o:title"]+' - '+d["oa:hasTarget"][0]["o:id"]);
            appendVideoToMediaCard(m, d, colVideo.append('video'));
        
            /*construction du body = liste des annotations
            m.body.append('h5')
                .attr("class", "card-title").html("Annotations");
            m.idlisteTracks = "listeTracks" + d["oa:hasTarget"][0]["o:id"];
            m.listeTracks = m.body.append('ul')
                .attr("class", "list-group listeTracks")
                .attr("id", d.idListeTracks);
            */
        
            //construction du body = réseau de lien
            m.r = new reseau({'cont':m.body
                ,'width':400,'height':300
                ,'data':{'nodes':[],'links':[]}
            });
            
            //construction du tag cloud
            //m.tc = TagCloud('#'+m.idBody, [d.text]);
        
            m.tracks = [];
            me.mediaCards[d[me.idCard][0]["o:id"]] = m;
        
        }        

        function  createMediaCardGenStory(track){

            let m = {},  d = track.p.value.entry;
            m.cardCont = d3.select("#mediaCards").append('div').attr('class','col')
                .attr('id', 'cardMedia' + d[me.idCard][0]["o:id"])
            m.card = m.cardCont.append("div").attr("class", "card text-white bg-dark");
            //carte : header - medias 
            let headCard = m.card.append('div').attr('class', 'card-header')
                .append('h5').html(d['category'])
                .append('button').attr('type',"button").attr('class',"btn btn-danger btn-sm mx-2")
                .on('click',function(e){
                    editSource(e,{'o:title':d['category'],'o:id':d["oa:hasSource"][0]["o:id"]});
                })
                .append('i').attr('class','fa-solid fa-marker');
            //gestion des médias
            let urlImg = d["oa:hasTarget"] ? d["oa:hasTarget"][0]["thumbnail_display_urls"].medium : '';
            if(urlImg){
                m.card.append('img').attr('class','card-img-top').attr('src',urlImg)
                    .attr('id','mcimg'+d["oa:hasTarget"][0]["o:id"])
                    .style('cursor','pointer')
                    .on('click', function(){showMediaOmk(d["oa:hasTarget"][0]);});        
            }else
                m.card.append('img').attr('class','card-img-top ChaoticumPapillonae');
            
            m.body = m.card.append('div')
                .attr("class", "card-body");
        
            //construction du body à chaque sélection
            m.tracks = [];
            me.mediaCards[d[me.idCard][0]["o:id"]] = m;
        
        }
        
        function editSource(e,t) {
            editItem(null, t, function(d){
                console.log(d);
            })
        }
        
        function editItem(e,d,cbClose){
            console.log(e,d);
            let dt = d.data ? d.data : d;
            if(!d.modal){
                let t = e ? e.currentTarget.id ? e.currentTarget.id : 'mainContent' : 'mainContent';
                //merci à https://stephanwagner.me/jBox/documentation
                d.modal = new jBox('Modal', {
                    title: '---',
                    overlay: false,
                    draggable: 'title',
                    repositionOnOpen: true,
                    repositionOnContent: true,
                    target: '#'+t,
                    position: {
                        x: 'left',
                        y: 'top'
                    },
                    title:dt['display_title'] ? dt['display_title'] : dt['o:title'],
                    content:getIframeItem(d),
                    onCloseComplete:function(){
                        if(cbClose)cbClose();
                    }
                })
            }
            d.modal.open();            
        }

        function getIframeItem(d){
            let url = actant ? urlAdmin+'/item/' : urlSite+'/item/';
            url += d['o:id'] ? d['o:id'] : d['value_resource_id']; 
            return `<iframe 
            width="600"
            height="600"
            src="${url}"></iframe>`;
        
        }        

        function appendVideoToMediaCard(m, d, v) {
            m.idVideo = "visiosVideo" + d["oa:hasTarget"][0]["o:id"];
            v.attr("id", m.idVideo)
                .attr("class", "video-js vjs-fluid card-img-top")
                .attr("controls", "true")
                .attr("preload", "auto")
                .attr("width", "400")
                .attr("height", "300")
                .attr("poster", urlPosterVideo);
            m.ready = false;
            m.videoIsPaused = true;
            m.video = videojs(m.idVideo,{
                controls:false
            })
            m.video.src({
                type: d["oa:hasTarget"][0]["o:media_type"],
                src: d["oa:hasTarget"][0]["o:original_url"]
            });
            m.video.ready(function () {
                let playPromise = m.video.play();
                if (playPromise !== undefined) {
                    playPromise.then(_ => {
                            m.video.pause()
                            d.videoIsPaused = false;
                            m.ready = true;
                            /*met à jour les extrémité du slider
                            sliderIndexStartEnd.noUiSlider.updateOptions({
                                range: {
                                    'min': 0,
                                    'max': m.video.duration()
                                }
                            });        
                            */
                        })
                        .catch(error => {
                            console.log(error)
                        });
                }
            });
            m.video.on('timeupdate', (e, d) => {
                /*met à jour les poignées du slider
                let stopDeb = d3.select('#inputIMdebPlay').style('display')
                  , stopFin = d3.select('#inputIMfinPlay').style('display');
                if(stopDeb=='none' && stopFin=='none')return;
                let ct = m.video.currentTime()
                  , posis = sliderIndexStartEnd.noUiSlider.get();
                if(stopDeb!='none')posis[0]=ct;
                if(stopFin!='none')posis[1]=ct;
                sliderIndexStartEnd.noUiSlider.updateOptions({
                      start: posis,        
                  });        
                */
            });
        }        

        function showMedias(d){
            if (d && d.ready) {
                let t = me.timeliner.currentTimeStore.value;
                if(me.timeliner.isPlaying()){
                    if (d.videoIsPaused){
                        d.video.play();
                        d.videoIsPaused = false;
                        //synchronise le timeliner et la vidéo avec une tolérance pour éviter les coupures
                        if (Math.trunc(d.video.currentTime()) != Math.trunc(t)) d.video.currentTime(t);
                    }
                }else{
                    d.video.pause();
                    d.videoIsPaused = true;                
                    //synchronise le timeliner et la vidéo avec une tolérance pour éviter les coupures
                    if (Math.trunc(d.video.currentTime()) != Math.trunc(t)) d.video.currentTime(t);
                }
            }
        }


        function showDetails(d) {
            if(d===undefined)return;
            let dataTracks = d.tracks.filter(i => i.a == 'c' || i.a == 'u').map(t=>t.p.value);
            d.body.selectAll("div").data(dataTracks)
                .join(
                    enter => {
                        if(enter.size())d.cardCont.style('display','block');
                        let mainDiv = enter.append('div');
                        mainDiv.append('h6').attr('class', 'mb-1')
                            .style('color', d => d.entry._color)
                            .html(d => d.entry.text);
                        mainDiv.append('button').attr('type',"button").attr('class',"btn btn-danger btn-sm mx-2 btnEdit")
                            .on('click',me.editTrack)
                            .append('i').attr('class','fa-solid fa-marker');
                        mainDiv.append('button').attr('type',"button").attr('class',"btn btn-danger btn-sm mx-2 btnDelete")
                            .on('click',me.deleteTrack)
                            .append('i').attr('class','fa-solid fa-trash-can');
                    },
                    update => {
                        if(update.size())d.cardCont.style('display','block');
                        if(actant){
                            update.select('.btnEdit').on('click', me.editTrack);
                            update.select('.btnDelete').on('click', me.deleteTrack);                    
                        }
                        update.select('h6').style('color', d => d.entry._color).html(d => d.entry.text);                
                    },
                    exit => {
                        exit.remove();
                    }
                );
        }        


        function showMediaOmk(target){

            me.mdShowMedia.setTitle(target['o:title'] ? target['o:title'] : 'sans titre' + ' : ' + target['o:id']);
        
            //enregistre dans la base
            $.ajax({
                type: 'GET',
                dataType: 'html',
                url: me.urls.mediaRender+target['o:id'],
            }).done(function (data) {
                me.mdShowMedia.setContent(data);
                me.mdShowMedia.open();
            })
            .fail(function (e) {
                console.log(e);
            })
            .always(function () {
                console.log('addMedia '+target['o:id']);
            });
        
        }
        

        function showListeTracks(d) {
            if(!d || d.listeTracks=== undefined)return;
            let dataTracks = d.tracks.filter(i => i.a == 'c' || i.a == 'u');
            //d.listeTracks.selectAll("li").remove();
            d.listeTracks.selectAll("li").data(dataTracks)
                .join(
                    enter => {
                        let aSem = enter.append('li').attr('class', 'list-group-item')
                            .attr("id", d => 'detailTrack_' + d.p.value.entry.idObj)
                            .attr("aria-current", "true");
                        let aSemBody = aSem.append('div').attr('class', 'd-flex w-100 justify-content-between');
                        let tools = aSemBody.append('div');
                        if(actant){
                            tools.append('span').attr('class', 'btnDel px-2')
                                .style('cursor', 'pointer')
                                .on('click', me.deleteTrack)
                                .append('i').attr('class', 'fa-solid fa-trash-can');
                            tools.append('span').attr('class', 'btnEdit px-2')
                                .style('cursor', 'pointer')
                                .on('click', me.editTrack)
                                .append('i').attr('class', 'fa-solid fa-pen-to-square');
                        }
                        aSemBody.append('h6').attr('class', 'mb-1')
                            .style('color', d => d.p.value.entry._color)
                            .html(d => d.p.value.entry.category);
                        //aSemBody.append('small').html(d=>d.creator);
                        aSem.append('p').html(d => d.p.value.entry.text);
                    },
                    update => {
                        update.attr("id", d => {
                            return 'detailTrack_' + d.p.value.entry.idObj
                        });
                        if(actant){
                            update.select('.btnEdit').on('click', me.editTrack);
                        }
                        update.select('h6').style('color', d => d.p.value.entry._color).html(d => d.p.value.entry.category);
                        update.select('p').html(d => d.p.value.entry.text);
                    },
                    exit => exit.remove()
                );
        }
        
        this.editTrack = function(e, data, entry) {
            //initialisation des suggestions
            initSuggestions("sgtRelations");

            let d = data ? data.entry : entry;
            me.mdEditTrack.setTitle(d.category + ' : ' + d.idObj);
            document.getElementById('inputIMtitre').value = d.text;
            document.getElementById('inputOrdre').value = d.ordre ? d.ordre : 1;
            document.getElementById('inputIMdesc').value = d.desc ? d.desc : "";
            document.getElementById('inputIMdeb').value = d.time;
            document.getElementById('inputIMdebHelp').innerHTML = me.secondsToHms(d.time);
            document.getElementById('inputIMfin').value = d.timeEnd;
            document.getElementById('inputIMfinHelp').innerHTML = me.secondsToHms(d.timeEnd);
            document.getElementById('inputIMcolor').value = d3.color(d._color).formatHex();
            document.getElementById('inputIMcolorHelp').innerHTML = d._color;
            document.getElementById('idCat').value = d.idCat;
            document.getElementById('idObj').value = d.idObj;
            document.getElementById('category').value = d.category;
            document.getElementById('idGroup').value = d.idGroup;
            document.getElementById('idScope').value = d["oa:hasScope"] ? d["oa:hasScope"][0]["o:id"] : "";
            document.getElementById('idSource').value = d["oa:hasSource"] ? d["oa:hasSource"][0]["o:id"] : "";
            d.idTarget = document.getElementById('idTarget').value = d["oa:hasTarget"] ? d["oa:hasTarget"][0]["o:id"] : "";
            document.getElementById('idLayer').value =d.idLayer !== undefined ? d.idLayer : data.idLayer;
            document.getElementById('idEntry').value = d.idEntry !== undefined ? d.idEntry : data.idEntry;
            if (d.idObj) {
                //masque le sélectionneur de média
                document.getElementById('choixMedia').style.display = 'none';
                document.getElementById('btnIMajout').style.display = 'none';
                document.getElementById('btnIMmodif').style.display = 'block';
                document.getElementById('btnIMdelete').style.display = 'block';
            } else {
                //affiche le sélectionneur de média
                document.getElementById('choixMedia').style.display = 'block';
                document.getElementById('btnIMajout').style.display = 'block';
                document.getElementById('btnIMmodif').style.display = 'none';
                document.getElementById('btnIMdelete').style.display = 'none';
            }
            //ajoute les propriétés sélectionnées
            me.sgtProps.forEach(p=>{
                p.relations = [];
                if(d[p.p['o:term']]){
                    p.relations = d[p.p['o:term']];                    
                    createRelationToItem("sgtRelations",p,d);            
                }
                //ajoute automatiquement la catégorie à la création d'une track
                if(!data && p.p['o:term']=='schema:category'){
                    getItem(d.idCat, oCat=>{
                        if(oCat){
                            p.relations.push(oCat);                    
                            createRelationToItem("sgtRelations",p);                
                        }    
                    });
                }                
            })

            //affiche le carousel des medias
            initMediasCarousel("carouselMedias", d["oa:hasSource"][0]);    
            initMediaTarget('selectMedia', d["oa:hasTarget"] ? d["oa:hasTarget"][0] : false);


            //vérifie si l'utilisateur à le droit de modifier
            if(d["dcterms:creator"] && d["dcterms:creator"][0]["o:id"] != actant["o:id"]){
                let html = '<div class="alert alert-danger" role="alert">'
                    +'<i class="fa-solid fa-triangle-exclamation"></i>'
                    +"<div>Interdit de modifier une entrée d'un autre utilisateur.</div>"
                    +"<div>Une nouvelle entrée sera créée.</div>"
                    +"</div>"
                , n = new jBox('Notice', {
                    content: html,
                    color: 'black',
                    position: {
                        y: 'center',
                        x: 'center'
                    }
                });        
                document.getElementById('btnIMajout').style.display = 'block';
                document.getElementById('btnIMmodif').style.display = 'none';
                document.getElementById('idGroup').value = 0;
        
            }
            me.mdEditTrack.open();        
        }



        function initMediaTarget(idCont,media){

            let i = d3.select('#'+idCont).select('img'),
                l = d3.select('#'+idCont).select('label');
        
            if(media){
                i.attr('class','card-img-top')
                    .style('cursor','pointer')
                    .attr('src',media["thumbnail_display_urls"].medium)
                    .on('click',function(){showMedia(media);}); 
                l.html(media['o:title'] ? 'Média sélectionné : '+media['o:title'] : 'Média sélectionné : no title');
                document.getElementById('idTarget').value=media['o:id'];
            }else{
                i.attr('class',"ChaoticumPapillonae")
                    .attr('src','')
                    .style('cursor','pointer')
                    .on('click',console.log('initMediaTarget:no media')); 
                l.html("Aucun média sélectionné");       
            }
        
        }
        
        function initMediasCarousel(idCont, item){
        
            if(item['o:media'] && item['o:media'].length){
                let carousel = d3.select('#'+idCont).style('display','block');
                //récupère la définition des médias
                $.ajax({
                    type: 'GET',
                    dataType: 'json',
                    url: urlApi + '/media?item_id='+item['o:id'],
                }).done(function (data) {
                    let indicator = carousel.select('#'+idCont+'Indicator');
                    indicator.selectAll('button').remove();  
                    indicator.selectAll('button').data(data).enter().append('button')
                        .attr('type',"button")
                        .attr("data-bs-target","#"+idCont)
                        .attr("data-bs-slide-to",(d,i)=>i)
                        .attr("class",(d,i)=>i==0 ? "active" : "")
                        .attr("aria-current",true)
                        .attr("aria-label",(d,i)=>"Slide "+i);
                    let inner = carousel.select('#'+idCont+'Inner');
                    inner.selectAll('div').remove();
                    inner.selectAll('div').data(data).enter().append('div')
                        .attr('class',(d,i)=> i==0 ? "carousel-item active" : "carousel-item")
                        .append("img")
                            .attr('class',"d-block w-100")
                            .style('cursor','pointer')
                            .attr('src',d=>d["thumbnail_display_urls"].medium)
                            .on('click',function(e,d){
                                initMediaTarget('selectMedia',d);
                            });
                })
                .fail(function (e) {
                    console.log(e);
                })
                .always(function () {
                    console.log('initMediasCarousel '+item['o:id']);
                });
        
            }else{
                d3.select('#'+idCont).style('display','none');
            }
        
        }
        

        this.saveTrack = function(modif) {
            if (!document.getElementById('inputIMtitre').value) {
                let n = new jBox('Notice', {
                    content: 'Veuillez saisir un titre',
                    color: 'black',
                    position: {
                        y: 'center',
                        x: 'center'
                    }
                });
                return;
            }
            me.mdWait.open();
            //récupère les données saisies
            let dataTrack = {
                'dcterms:title': document.getElementById('inputIMtitre').value,
                'genstory:ordre': document.getElementById('inputOrdre').value,
                'dcterms:description': document.getElementById('inputIMdesc').value,
                'schema:category': document.getElementById('idCat').value,
                'oa:start': document.getElementById('inputIMdeb').value,
                'oa:end': document.getElementById('inputIMfin').value,
                'schema:color': document.getElementById('inputIMcolorHelp').innerHTML,
                'oa:hasSource': document.getElementById('idSource').value,
                'oa:hasTarget': document.getElementById('idTarget').value,
                'oa:hasScope': document.getElementById('idScope').value,
                'idGroup': document.getElementById('idGroup').value,
                'category': document.getElementById('category').value,
                'dcterms:creator': actant['o:id'],
                'idScenario': me.details.idScenario,
                'genstory:hasParam':[],
                'rt':me.rtTrack,
            }
            if (modif) dataTrack.idObj = document.getElementById('idObj').value;

            //récupère les relations    
            sgtProps.forEach(p=>{
                dataTrack[p.p['o:term']]=p.relations.map(r=>{ 
                    //vérifie si la référence est crée ou s'il faut le faire
                    return {'id':r['o:id']}; 
                });
                //vérifie si on récupère une fonction et ses paramètres
                if(p.p['o:term']=="genstory:hasEvenement"){
                    dataTrack[p.p['o:term']].forEach(r=>{
                        let li = d3.select('#'+p.p['o:local_name']+'_'+r.id);
                        if(li.select('p').size()){
                            dataTrack['genstory:hasFonction']=li.select('p').text();
                            li.selectAll('div input').each(function(ipt,i){
                                dataTrack['genstory:hasParam'].push(ipt['o:id'] ? {'id':ipt['o:id']} : ipt.value);                
                            })    
                        }
                    })
                }            

            })

            //enregistre dans la base
            $.ajax({
                    type: 'POST',
                    dataType: 'json',
                    url: me.urls.creaTrack,
                    data: dataTrack
                }).done(function (data) {
                    if(data.error){
                        new jBox('Notice', {
                            content: data.message,
                            color: 'black',
                            position: {
                                y: 'center',
                                x: 'center'
                            }
                        });    
                    }else{
                        let idLayer = document.getElementById('idLayer').value,
                            idEntry = document.getElementById('idEntry').value;
                        if (!modif) {
                            setLayer(data);
                        }else{
                            me.timeliner.updateTrack("layers:"+idLayer+":values:"+idEntry, data[0]);
                            me.timeliner.updateTrack("layers:"+idLayer+":values:"+(parseInt(idEntry, 10)+1), data[1]);
                        }
                        me.timeliner.repaintAll();
                    }
                })
                .fail(function (e) {
                    new jBox('Notice', {
                        content: me.htmlError,
                        color: 'black',
                        position: {
                            y: 'center',
                            x: 'center'
                        }
                    });    
                    console.log(e);
                })
                .always(function () {
                    me.mdWait.close();
                });
        }

        function setLayer(data){
            document.getElementById('idObj').value = data[0]['idObj'];
            document.getElementById('btnIMmodif').style.display = 'block';
            document.getElementById('btnIMajout').style.display = 'none';
            //récupère la clef du layer
            let layer = me.timeliner.getLayer('name',data[0]['category'])
            if(!layer.length){
                layer = me.timeliner.addLayer(data[0]['category'],data[0]['idGroup']);
            }else layer = layer[0];
            me.timeliner.addTrack(layer, data[1]);
            document.getElementById('idLayer').value = layer.idLayer;
            document.getElementById('idEntry').value = me.timeliner.addTrack(layer, data[0]);
        }

        function getItem(id, cb){
            me.mdWait.open();
            //enregistre dans la base
            $.ajax({
                type: 'GET',
                dataType: 'json',
                url: me.urls.getItem+id
            }).done(function (data) {
                cb(data);
            })
            .fail(function (e) {
                new jBox('Notice', {
                    content: me.htmlError,
                    color: 'black',
                    position: {
                        y: 'center',
                        x: 'center'
                    }
                });    
                console.log(e);                
            })
            .always(function () {
                me.mdWait.close();
            });
        }
        

        this.deleteLayer = function(l){
            //récupère les identifiant des tracks
            let dbl = {}, ids = [];
            l.values.forEach(v => {
                if(!dbl[v.idObj]){
                    dbl[v.idObj]=true;
                    ids.push(v.idObj);
                }
            });
            let confirm = new jBox('Confirm', {
                theme: 'TooltipDark',
                confirmButton: 'Do it!',
                cancelButton: 'Nope',
                content:"Etes vous certain de vouloir supprimer les "+ids.length+" track(s) de cette couche ?",
                confirm:function(){
                    //enregistre dans la base
                    $.ajax({
                        type: 'POST',
                        dataType: 'json',
                        url: me.urls.delLayer,
                        data: {'ids':ids}
                    }).done(function (data) {
                        if(!data.error) me.timeliner.deleteLayer(l);
                        new jBox('Notice', {
                            content: data.message,
                            color: 'black',
                            position: {
                                y: 'center',
                                x: 'center'
                            }
                        });
                    })
                    .fail(function (e) {
                        new jBox('Notice', {
                            content: me.htmlError,
                            color: 'black',
                            position: {
                                y: 'center',
                                x: 'center'
                            }
                        });    
                        console.log(e);
                    })
                    .always(function () {
                        me.mdWait.close();
                        me.mdEditTrack.close();
                    });
                }
            });
            confirm.open()
        }

        this.deleteTrack = function(e, d) {
            let id = d ? d.idObj : document.getElementById('idObj').value,
            idLayer = d ? d.idLayer : document.getElementById('idLayer').value,
            idEntry = d ? d.idEntry : document.getElementById('idEntry').value,
            idCard = d ?  d.entry["oa:hasSource"][0]["o:id"] : document.getElementById('idSource').value;
            //enregistre dans la base
            $.ajax({
                type: 'POST',
                dataType: 'json',
                url: me.urls.delTrack,
                data: {'id':id}
            }).done(function (data) {
                if(data.error){
                    new jBox('Notice', {
                        content: data.message,
                        color: 'black',
                        position: {
                            y: 'center',
                            x: 'center'
                        }
                    });    
                }else{
                    me.timeliner.deleteTrack(idLayer, idEntry);
                    d3.select('#cardMedia'+idCard).remove();
                }
            })
            .fail(function (e) {
                new jBox('Notice', {
                    content: me.htmlError,
                    color: 'black',
                    position: {
                        y: 'center',
                        x: 'center'
                    }
                });    
                console.log(e);
            })
            .always(function () {
                me.mdWait.close();
                me.mdEditTrack.close();
            });
        }

        this.secondsToHms = function(seconds) {
            seconds = Number(seconds);
            var h = Math.floor(seconds % (3600 * 24) / 3600);
            var m = Math.floor(seconds % 3600 / 60);
            var s = Math.floor(seconds % 60);
            var mili = (seconds-Math.floor(seconds)).toFixed(2).split('.')[1];
        
            var hDisplay = h > 0 ? (h >= 10 ? h + ":" : "0" + h + ":") : "00:";
            var mDisplay = m > 0 ? (m >= 10 ? m + ":" : "0" + m + ":") : "00:";
            var sDisplay = s > 0 ? (s >= 10 ? s + ":" : "0" + s + ":") : "00:";
            return hDisplay + mDisplay + sDisplay + mili;
        }
                
        this.timelinerPause = function(nodes, links){
            for (const mc in me.mediaCards) {
                if(me.mediaCards[mc].ready){
                    me.mediaCards[mc].video.pause();
                    me.mediaCards[mc].videoIsPaused = true;
                };
            }
        }
        this.timelinerPlay = function(nodes, links){
            for (const mc in me.mediaCards) {
                if(me.mediaCards[mc].ready){
                    me.mediaCards[mc].video.currentTime(me.timeliner.currentTimeStore.value);            
                    me.mediaCards[mc].video.play();
                    me.mediaCards[mc].videoIsPaused = false;
                };
            }
        }

        me.init();

    }
}

  


