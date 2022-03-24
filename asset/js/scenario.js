let timeliner, scenario, mediaCards = {},
    currentMedia, mediaIndex = [],
    mdEditIndex, mdAddScenario, mdShowMedia,
    sgtLieu, sgtEvent, sgtActant, sgt;
       
function initVisios() {
    showListeScenario();
    //gestion des boutons
    d3.select('#btnAjoutScenario').on('click', function (e) {
        mdAddScenario.open();
    });
    d3.select('#btnIMajout').on('click', function (e) {
        saveIndex();
    });
    d3.select('#btnIMmodif').on('click', function (e) {
        saveIndex(true);
    });
    d3.select('#btnSccreate').on('click', function (e) {
        createScenario(true);
    });    
    new jBox('Confirm', {
        theme: 'TooltipDark',
        confirmButton: 'Do it!',
        cancelButton: 'Nope'
      });

    mdWait = new jBox('Modal', {
        width: 200,
        height: 100,
        title: 'Patience...',
        content: '<div class="loading">' +
        '<p style="width:150px" >Merci de patienter...</p>' +
        '</div>'
    });
    mdEditIndex = new jBox('Modal', {
        width: 480,
        height: 600,
        theme: 'TooltipDark',
        overlay: false,
        title: "Edition de l'annotation",
        content: $('#mdEditIndex'),
        draggable: 'title',
        repositionOnOpen: false,
        repositionOnContent: false
    });
    mdAddScenario = new jBox('Modal', {
        width: 480,
        height: 384,
        theme: 'TooltipDark',
        overlay: false,
        title: "Add scenario",
        content: $('#mdAddScenario'),
        draggable: 'title',
        repositionOnOpen: false,
        repositionOnContent: false
    });
    mdShowMedia = new jBox('Modal', {
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
}



//fonction spécifiques à la page  
function saveIndex(modif) {
    if (!document.getElementById('inputIMtitre').value) {
        let n = new jBox('Notice', {
            content: 'Veuillez saisir un titre',
            color: 'black',
            position: {
                y: window.innerHeight / 2,
                x: window.innerWidth / 2
            }
        });
        return;
    }
    mdWait.open();
    //récupère les données saisies
    let action = modif ? 'saveIndex' : 'createTrack'
    , dataIndex = {
        'dcterms:title': document.getElementById('inputIMtitre').value,
        'dcterms:description': document.getElementById('inputIMdesc').value,
        'oa:start': document.getElementById('inputIMdeb').value,
        'oa:end': document.getElementById('inputIMfin').value,
        'schema:color': document.getElementById('inputIMcolorHelp').innerHTML,
        'oa:hasSource': document.getElementById('idSource').value,
        'oa:hasTarget': document.getElementById('idTarget').value,
        'oa:hasScope': document.getElementById('idScope').value,
        'idGroup': document.getElementById('idGroup').value,
        'idCat': document.getElementById('idCat').value,
        'category': document.getElementById('category').value,
        'dcterms:creator': actant['o:id'],
        'idScenario': scenario['o:id'],
        'rt':'Scenario track'
    }
    if (modif) dataIndex.idObj= document.getElementById('idObj').value;
    props.forEach(p=>{
        dataIndex[p['o:term']]=p.relations.map(r=>{ return {'id':r['o:id']}; });
    })

    //enregistre dans la base
    $.ajax({
            type: 'POST',
            dataType: 'json',
            url: urlSite + '/page/ajax?helper=Scenario&type='+action+'&json=1',
            data: dataIndex
        }).done(function (data) {
            let idLayer = document.getElementById('idLayer').value,
                idEntry = document.getElementById('idEntry').value;
            if (!modif) {
                document.getElementById('idObj').value = data[0]['idObj'];
                document.getElementById('btnIMmodif').style.display = 'block';
                document.getElementById('btnIMajout').style.display = 'none';
                //document.getElementById('mcimg'+media["o:id"]).src=media["thumbnail_display_urls"].medium;       

                //récupère la clef du layer
                layer = timeliner.getLayer('name',data[0]['category'])
                if(!layer.length){
                    layer = timeliner.addLayer(data[0]['category']);
                }else layer = layer[0];
                document.getElementById('idLayer').value = layer.idLayer;
                //ajout de l'entrée dans le layer
                document.getElementById('idEntry').value = timeliner.addTrack(layer, data[0]);
                timeliner.addTrack(layer, data[1]);
            }else{
                timeliner.updateTrack("layers:"+idLayer+":values:"+idEntry, data[0]);
                timeliner.updateTrack("layers:"+idLayer+":values:"+(parseInt(idEntry, 10)+1), data[1]);
            }
            timeliner.repaintAll();

        })
        .fail(function (e) {
            console.log(e);
        })
        .always(function () {
            mdWait.close();
        });
}

function createScenario() {
    mdWait.open();
    //récupère les données saisies
    let dataScena = {
        'dcterms:title': document.getElementById('inputSctitre').value,
        'dcterms:description': document.getElementById('inputScdesc').value,
        'dcterms:creator': actant['o:id'],
        'genstory:hasHistoire':[],
        'props':props.map(p=>p['o:term'])
    }
    storiesToScenario.forEach(s=>dataScena['genstory:hasHistoire'].push(s['o:id']));
    //enregistre dans la base
    $.ajax({
            type: 'POST',
            dataType: 'json',
            url: urlSite + '/page/ajax?helper=Scenario&type=genereScenario&json=1&gen=fromStories',
            data: dataScena
        }).done(function (data) {
            itemsScenario.push(data);
            showListeScenario();  
            chargeScenario(null, data);
        })
        .fail(function (e) {
            console.log(e);
        })
        .always(function () {
            mdWait.close();
        });
}

function showTimeliner() {
    timeliner.show('dock-bottom-sam');
    animate();
}


function showListeScenario() {
    d3.select('#ddmListeScenario').selectAll('li').remove();
    d3.select('#ddmListeScenario').selectAll('li').data(itemsScenario).enter().append('li').append('a')
        .attr("class", "dropdown-item")
        .html((s, i) => {
            return s['o:title'];
        })
        .on('click', chargeScenario);
}

function chargeScenario(e, d) {
    //supprime les médias cards
    d3.select("#mediaCards").selectAll("div").remove();   
    mediaCards=[]; 
    mediaIndex=[];
    d3.select("#btnCurrentScenario").text('...');

    //vérifie s'il faut calculer le scénario
    //on le fait dans tous les cas pour avoir la dernière version des targets
    //let refs = d["dcterms:isReferencedBy"][0]["@value"].split('-');
    //if (refs.length > 1 && actant) {
    if (actant) {
            mdWait.open();
        let dataScena = {'idScenario':d["o:id"],'idActant':actant['o:id']}    
        $.ajax({
                type: 'POST',
                dataType: 'json',
                url: urlSite + '/page/ajax?helper=Scenario&type=genereScenario&json=1&gen=fromUti',
                data:dataScena
            }).done(function (data) {
                d.details = JSON.parse(data['schema:object'][0]['@value']);
                scenario = d;
                initSuggestions();
                showTimeliner();
                timeliner.load(scenario.details);
            })
            .fail(function (e) {
                console.log(e);
            })
            .always(function () {
                mdWait.close();
            });
    } else {
        if (!d.details) d.details = JSON.parse(d['schema:object'][0]['@value']);
        scenario = d;
        showTimeliner();
        timeliner.load(scenario.details);
    }
    d3.select("#btnCurrentScenario").text(d['o:title']);
    d3.select("#gbManipScenario").selectAll('button').style('visibility','visible');
}
function initSuggestions(){

    let sgtRela = d3.select("#sgtRelations");
    sgtRela.selectAll('div').remove();
    let mainDiv = sgtRela.selectAll('div').data(props).enter().append('div').attr('class',"col-12");
    mainDiv.append('label').attr('class',"form-label").html(p=>p['o:local_name'].substr(3));
    mainDiv.append('div').attr('id',p=>'choix'+p['o:local_name'].substr(3))
        .append('input').attr('class',"typeahead").attr('type','text').attr('placeholder',p=>'Choisir '+p['o:local_name'].substr(3));
    mainDiv.append('ul').attr('id',p=>'choose'+p['o:local_name'].substr(3))
        .attr("class","list-group list-group-flush");  

    props.forEach(p=>{
        let className = p['o:local_name'].substr(3);
        p.relations = [];
        p.sgt = new Bloodhound({
            datumTokenizer: Bloodhound.tokenizers.obj.whitespace('o:title'),
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            identify: function(obj) { 
                return obj['o:id']; 
              },
            local: getSuggestionsData(p),
            initialize: false,
          });
        var promise = p.sgt.initialize();
        promise
          .done(function() { 
              console.log('ready to go!'); })
          .fail(function() { 
              console.log('err, something went wrong :('); });

        $('#choix'+className+' .typeahead').typeahead(null, {
        name: 'omk-'+className,
        display: 'o:title',
        source: p.sgt,
        templates: {
            empty: [
            '<div class="empty-message">',
                'no '+className+' found',
            '</div>'
            ].join('\n'),
            suggestion: Handlebars.compile('<div><strong>{{o:title}}</strong> – {{o:id}}</div>')
        }  
        });
        $('#choix'+className+' .typeahead').bind('typeahead:select', function(ev, d) {        
            p.relations.push(d);
            createRelationToTrack(p);
        })        
    })      
}
function createRelationToTrack(p){        
    let className = p['o:local_name'].substr(3);
    d3.select('#choose'+className).selectAll('li').remove();
    d3.select('#choose'+className).selectAll('li').data(p.relations).enter()
        .append('li').attr('class',"list-group-item").attr('id',r=>className+'_'+r['o;id'])
        .html(r=>r['o:title'])
        .append('button').attr('class',"btn btn-danger btn-sm mx-2")
            .html('X')
            .on('click',(e,d)=>{
                let i = p.relations.map(r => r['o:id']).indexOf(d['o:id']);
                p.relations.splice(i, 1);
                createRelationToTrack();
            });
}
      
function getSuggestionsData(p){
    let layers = scenario.details.layers.filter(l=>l.class["o:label"]==p['o:local_name'].substr(3));
    return layers.map(l=>l.source);
}
function deleteScenario(e) {
    mdWait.open();
    $.ajax({
        type: 'GET',
        dataType: 'json',
        url: urlSite + '/page/ajax?helper=Scenario&type=deleteScenario&json=1&item_id=' + scenario['o:id'],
    }).done(function (data) {
        if(!data['error']){
            timeliner.hide();
            //suprime le scenario
            let i = itemsScenario.map(s => s['o:id']).indexOf(scenario['o:id']);
            itemsScenario.splice(i, 1);
            showListeScenario();  
            d3.select("#btnCurrentScenario").text('...');
            d3.select("#gbManipScenario").selectAll('button').style('visibility','hidden');        
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
        console.log(e);
    })
    .always(function () {
        mdWait.close();
    });
}
function editTrack(e,t) {
    editDetail(e, t);
}
function deleteTrack(e,t) {
    //vérifie si l'utilisateur à le droit de modifier
    if(t.p.value.entry['dcterms:creator:id'] != actant["o:id"]){
        let html = '<div class="alert alert-danger" role="alert">'
            +'<i class="fa-solid fa-triangle-exclamation"></i>'
            +"<div>Interdit de supprimer une entrée d'un autre utilisateur.</div>"
            +"</div>"
        , n = new jBox('Notice', {
            content: html,
            color: 'black',
            position: {
                y: 'center',
                x: 'center'
            }
        });        
    }else{
        mdWait.open();
        $.ajax({
            type: 'POST',
            dataType: 'json',
            url: urlSite + '/page/ajax?helper=Scenario&type=deleteTrack&json=1',
            data:{'id':t.p.value.entry.idObj}
        }).done(function (data) {
            if(!data['error']){
                timeliner.deleteTrack(t.p.idLayer, t.p.value.idEntry);
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
            console.log(e);
        })
        .always(function () {
            mdWait.close();
        });
    
    }
}
function editSource(e,t) {
    editItem(null, t, function(d){
        console.log(d);
    })
}
function editScenario(e) {
    editItem(null, scenario, function(d){
        chargeScenario(e, d);
    })
}
function reloadScenario(e) {
    getItem(scenario, function(data){
        chargeScenario(null, data);
    });
}


function animate() {
    requestAnimationFrame(animate);
    showTimelinerTarget();
}

function showTimelinerTarget() {

    let objects = timeliner.getObjetActions();
    mediaIndex.forEach(v => v.a = 'd');
    for (const o in objects) {
        let oa = objects[o];
        for (const a in oa.actions) {
            let p = oa.actions[a];
            switch (p.prop) {
                case 'omk_MediaIndex':
                case 'TrackAction':
                    joinMediaIndex(o, p);
                    break;
            }
        }
    }
    if (mediaIndex.length) showMediaIndex(timeliner.currentTimeStore.value);
}


function joinMediaIndex(id, p) {
    if (mediaIndex[id]){
        mediaIndex[id].p = p;
        mediaIndex[id].a = 'u';
    } else {
        mediaIndex[id]={'p':p,'a':'c'};
        //vérifie s'il faut créer le média
        let idSource = mediaIndex[id].p.value.entry['oa:hasSource'][0]['o:id'];
        if (!mediaCards[idSource]) createMediaCard(mediaIndex[id]);
        mediaCards[idSource].index.push(mediaIndex[id]);
    }
}


function showMediaIndex(s) {
    for (const mc in mediaCards) {
        let d = mediaCards[mc];
        if (d.ready) {
            if(timeliner.isPlaying()){
                if (d.video.paused()){
                    d.video.play();
                }
            }else{
                d.video.pause();                
            }
            //synchronise le timeliner et la vidéo avec une tolérance pour éviter les coupures
            if (Math.trunc(d.video.currentTime()) != Math.trunc(s)) d.video.currentTime(s);
        }
        //affiche les details
        showDetails(d);
    }
}

function createMediaCard(data) {


    let m = {},  d = data.p.value.entry;
    m.cardCont = d3.select("#mediaCards").append('div').attr('class','col')
        .attr('id', 'cardMedia' + d.idTarget)
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
            .on('click', function(){showMedia(d["oa:hasTarget"][0]);});        
    }else
        m.card.append('img').attr('class','card-img-top ChaoticumPapillonae');
    
    m.body = m.card.append('div')
        .attr("class", "card-body");

    //construction du body à chaque sélection
    m.index = [];
    mediaCards[d["oa:hasSource"][0]["o:id"]] = m;


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

    if(item['o:media'].length){
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


function showMedia(target){

    mdShowMedia.setTitle(target['o:title'] ? target['o:title'] : 'sans titre' + ' : ' + target['o:id']);

    //enregistre dans la base
    $.ajax({
        type: 'GET',
        dataType: 'html',
        url: urlSite + '/page/ajax?helper=mediaRender&id='+target['o:id']+'&json=1',
    }).done(function (data) {
        mdShowMedia.setContent(data);
        mdShowMedia.open();
    })
    .fail(function (e) {
        console.log(e);
    })
    .always(function () {
        console.log('addMedia '+target['o:id']);
    });

}

function appendVideoToMediaCard(m, d, c) {
    var obj = document.createElement('video');
    if(obj.canPlayType(d.typeTarget)){
        let v = c.append('video');
        m.idVideo = "visiosVideo" + d.idTarget;
        v.attr("id", m.idVideo)
            .attr("class", "video-js vjs-fluid card-img-top")
            .attr("controls", "true")
            .attr("preload", "auto")
            .attr("width", "400")
            .attr("height", "300")
            .attr("poster", urlPosterVideo);
        m.ready = false;
        m.video = videojs(m.idVideo,{
            controls:false
        })
        m.video.src({
            type: d.typeTarget,
            src: d.urlTarget
        });
        m.video.ready(function () {
            let playPromise = m.video.play();
            if (playPromise !== undefined) {
                playPromise.then(_ => {
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
}

function getChildrenIds(s) {
    let ids = [];
    if (s.hasChildNodes()) {
        s.childNodes.forEach(c => ids.push(c.id));
    }
    return ids;
}

function notContainedCard(arr) {
    return function arrNotContains(e) {
        return arr.indexOf('cardMedia' + e[0]) === -1;
    };
}


function showDetails(d) {
    let dataIndex = d.index.filter(i => i.a == 'c' || i.a == 'u');
    //d.listeDetails.selectAll("li").remove();
    d.cardCont.style('display','none');
    d.body.selectAll("div").data(dataIndex)
        .join(
            enter => {
                if(enter.size())d.cardCont.style('display','block');
                let mainDiv = enter.append('div');
                mainDiv.append('h6').attr('class', 'mb-1')
                    .style('color', d => d.p.value.entry._color)
                    .html(d => d.p.value.entry.text);
                mainDiv.append('button').attr('type',"button").attr('class',"btn btn-danger btn-sm mx-2 btnEdit")
                    .on('click',editTrack)
                    .append('i').attr('class','fa-solid fa-marker');
                mainDiv.append('button').attr('type',"button").attr('class',"btn btn-danger btn-sm mx-2 btnDelete")
                    .on('click',deleteTrack)
                    .append('i').attr('class','fa-solid fa-trash-can');
            },
            update => {
                if(update.size())d.cardCont.style('display','block');
                if(actant){
                    update.select('.btnEdit').on('click', editTrack);
                    update.select('.btnDelete').on('click', deleteTrack);                    
                }
                update.select('h6').style('color', d => d.p.value.entry._color).html(d => d.p.value.entry.text);                
            },
            exit => {
                exit.remove();
            }
        );
}

function editDetail(e, data, entry) {
    let d = data ? data.p.value.entry : entry;
    mdEditIndex.setTitle(d.category + ' : ' + d.idObj);
    document.getElementById('inputIMtitre').value = d.text;
    document.getElementById('inputIMdesc').value = d.desc ? d.desc : "";
    document.getElementById('inputIMdeb').value = d.time;
    document.getElementById('inputIMdebHelp').innerHTML = secondsToHms(d.time);
    document.getElementById('inputIMfin').value = d.timeEnd;
    document.getElementById('inputIMfinHelp').innerHTML = secondsToHms(d.timeEnd);
    document.getElementById('inputIMcolor').value = d3.color(d._color).formatHex();
    document.getElementById('inputIMcolorHelp').innerHTML = d._color;
    document.getElementById('idCat').value = d.idCat;
    document.getElementById('idObj').value = d.idObj;
    document.getElementById('category').value = d.category;
    document.getElementById('idGroup').value = d.idGroup;
    document.getElementById('idScope').value = d["oa:hasScope"] ? d["oa:hasScope"][0]["o:id"] : "";
    document.getElementById('idSource').value = d["oa:hasSource"] ? d["oa:hasSource"][0]["o:id"] : "";
    document.getElementById('idTarget').value = d["oa:hasTarget"] ? d["oa:hasTarget"][0]["o:id"] : "";
    document.getElementById('idLayer').value = data ? data.p.idLayer : entry.idLayer;
    document.getElementById('idEntry').value = data ? data.p.value.idEntry : entry.idEntry;
    //masque le sélectionneur de média
    document.getElementById('choixMedia').style.display = 'none';
    
    if (d.idObj) {
        //affiche / cache les boutons nécessaires
        document.getElementById('btnIMajout').style.display = 'none';
        document.getElementById('btnIMmodif').style.display = 'block';

        //affiche le carousel des medias
        initMediasCarousel("carouselMedias", d["oa:hasSource"][0]);    

        initMediaTarget('selectMedia', d["oa:hasTarget"] ? d["oa:hasTarget"][0] : false);
        
    
        //ajoute les propriétés sélectionnées
        props.forEach(p=>{
            p.relations = [];
            if(d[p['o:term']])p.relations = d[p['o:term']];                    
            createRelationToTrack(p);            
        })

        //vérifie si l'utilisateur à le droit de modifier
        if(d['dcterms:creator'][0]['o:id'] != actant["o:id"]){
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


    } else {
        /*affiche le sélectionneur de média
        document.getElementById('choixMedia').style.display = 'block';
        */
        //affiche / cache les boutons nécessaires
        document.getElementById('btnIMajout').style.display = 'block';
        document.getElementById('btnIMmodif').style.display = 'none';
        d3.select('#carouselMedias').style('display','none');
    }
    mdEditIndex.open();

}

function addKeyframe(l, v, o) {
    //console.log(l);
    let ids = l.id.split(':');
    editDetail(null,null, {
        'idCat': ids[0],
        'idEntry': v,
        'idCreator':actant["o:id"],
        'category': l.name,
        'oa:hasScope': [{'o:id':ids[1]}],
        'oa:hasSource': [{'o:id':ids[3]}],
        'oa:hasTarget': 0,
        'idGroup': l.id,
        'idLayer':l.idLayer,    
        'text': l.name+" "+l.values.length,
        'desc': '--',
        'time': o.time,
        'timeEnd': o.time + 5,
        '_color': o._color,
        'tween': 'linear' //par defaut le tween est linear pour automatiquement mettre une plage de couleur
    })
}

function changeKeyframe(l,v){   
    let entry = v.object;
    if(!entry.idObj){
        let te = entry.time;
        entry = l.values[v.index-1];
        entry.idEntry=v.index-1;
        entry.idLayer=v.object.idLayer;
        entry.timeEnd = te;
    }
    editDetail(null, null, entry);
}

function secondsToHms(seconds) {
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

