let semSelect = {},
    timeliner, scenario, mediaCards = {},
    currentSource, currentMedia, videoIndex = [],
    mdEditIndex,
    listeDetails = d3.select('#listeDetails');


function initVisios() {
    showListeScenario();
    //gestion des boutons
    d3.select('#btnAjoutScenario').on('click', function (e) {
        showTimeliner();
    });
    d3.select('#btnAjoutMedia').on('click', function (e) {
        showTimeliner();
    });
    d3.select('#btnIMajout').on('click', function (e) {
        saveIndex();
    });
    d3.select('#btnIMmodif').on('click', function (e) {
        saveIndex(true);
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
        height: 384,
        theme: 'TooltipDark',
        overlay: false,
        title: "Edition de l'annotation",
        content: $('#mdEditIndex'),
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
    let dataIndex = {
        'dcterms:title': document.getElementById('inputIMtitre').value,
        'dcterms:description': document.getElementById('inputIMdesc').value,
        'schema:category': document.getElementById('idCat').value,
        'oa:start': document.getElementById('inputIMdeb').value,
        'oa:end': document.getElementById('inputIMfin').value,
        'schema:color': document.getElementById('inputIMcolorHelp').innerHTML,
        'oa:hasSource': document.getElementById('idSource').value,
        'oa:hasTarget': document.getElementById('idTarget').value,
        'idGroup': document.getElementById('idGroup').value,
        'category': document.getElementById('category').value,
        'dcterms:creator': actant['o:id'],
    }
    if (modif) dataIndex.idIndex = document.getElementById('idIndex').value;

    //enregistre dans la base
    $.ajax({
            type: 'POST',
            dataType: 'json',
            url: urlSite + '/page/ajax?helper=Scenario&type=saveIndex&json=1',
            data: dataIndex
        }).done(function (data) {
            let idLayer = document.getElementById('idLayer').value,
                idEntry = document.getElementById('idEntry').value;
            if (!modif) {
                document.getElementById('idIndex').value = data[0]['idIndex'];
                document.getElementById('btnIMmodif').style.display = 'block';
                document.getElementById('btnIMajout').style.display = 'none';
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

    //vérifie s'il faut calculer le scénario
    let refs = d["dcterms:isReferencedBy"][0]["@value"].split('-');
    if (refs.length > 1 && actant) {
        mdWait.open();
        $.ajax({
                type: 'GET',
                dataType: 'json',
                url: urlSite + '/page/ajax?helper=Scenario&type=genereScenario&json=1&item_id=' + refs[1] + '&gen=' + refs[0],
            }).done(function (data) {
                d.details = JSON.parse(data['schema:object'][0]['@value']);
                scenario = d;
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

}

function animate() {
    requestAnimationFrame(animate);
    showTimelinerTarget();
}

function showTimelinerTarget() {

    let objects = timeliner.getObjetActions();
    videoIndex.forEach(v => v.a = 'd');
    for (const o in objects) {
        let oa = objects[o];
        for (const a in oa.actions) {
            let p = oa.actions[a];
            switch (p.prop) {
                case 'omk_videoIndex':
                    joinVideoIndex(o, p);
                    break;
            }
        }
    }
    if (videoIndex.length) showVideoIndex(timeliner.currentTimeStore.value);
}


function joinVideoIndex(id, p) {
    if (videoIndex[id]){
        videoIndex[id].p = p;
        videoIndex[id].a = 'u';
    } else {
        videoIndex[id]={'p':p,'a':'c'};
        //vérifie s'il faut créer le média
        let idTarget = videoIndex[id].p.value.entry.idTarget;
        if (!mediaCards[idTarget]) createMediaCard(videoIndex[id]);
        mediaCards[idTarget].index.push(videoIndex[id]);
    }
}


function showVideoIndex(s) {
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


    let m = {},
        d = data.p.value.entry;
    m.card = d3.select("#mediaCards").append("div")
        .attr('id', 'cardVideo' + d.idTarget)
        .attr("class", "card text-white bg-dark");

    /*carte vidéo haut annotation bas
    appendVideoToMediaCard(m, d, m.card.append('video'));
    m.body = m.card.append('div')
    .attr("class", "card-body");
    */

    //carte annotation droite vidéo gauche
    let rowCard = m.card.append('div').attr('class', 'row g-0');
    let colAnno = rowCard.append('div').attr('class', 'col-md-6');
    m.body = colAnno.append('div')
        .attr("class", "card-body");
    let colVideo = rowCard.append('div').attr('class', 'col-md-6');
    colVideo.append('h5').html(d['nameTarget']);
    appendVideoToMediaCard(m, d, colVideo.append('video'));

    //construction du body
    m.body.append('h5')
        .attr("class", "card-title").html("Annotations");
    m.idListeDetails = "listeDetails" + d.idTarget;
    m.listeDetails = m.body.append('ul')
        .attr("class", "list-group listeDetails")
        .attr("id", d.idListeDetails);
    m.index = [];
    mediaCards[d.idTarget] = m;


}

function appendVideoToMediaCard(m, d, v) {
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

function getChildrenIds(s) {
    let ids = [];
    if (s.hasChildNodes()) {
        s.childNodes.forEach(c => ids.push(c.id));
    }
    return ids;
}

function notContainedCard(arr) {
    return function arrNotContains(e) {
        return arr.indexOf('cardVideo' + e[0]) === -1;
    };
}

function hideDetails(ids) {
    listeDetails.select('#detailIndex_' + d.idObj).style('display', 'none');
}

function showDetails(d) {
    let dataIndex = d.index.filter(i => i.a == 'c' || i.a == 'u');
    //d.listeDetails.selectAll("li").remove();
    d.listeDetails.selectAll("li").data(dataIndex)
        .join(
            enter => {
                let aSem = enter.append('li').attr('class', 'list-group-item')
                    .attr("id", d => 'detailIndex_' + d.p.value.entry.idObj)
                    .attr("aria-current", "true");
                let aSemBody = aSem.append('div').attr('class', 'd-flex w-100 justify-content-between');
                let tools = aSemBody.append('div');
                if(actant){
                    tools.append('span').attr('class', 'btnDel px-2')
                        .style('cursor', 'pointer')
                        .on('click', deleteDetail)
                        .append('i').attr('class', 'fa-solid fa-trash-can');
                    tools.append('span').attr('class', 'btnEdit px-2')
                        .style('cursor', 'pointer')
                        .on('click', editDetail)
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
                    return 'detailIndex_' + d.p.value.entry.idObj
                });
                if(actant){
                    update.select('.btnEdit').on('click', editDetail);
                }
                update.select('h6').style('color', d => d.p.value.entry._color).html(d => d.p.value.entry.category);
                update.select('p').html(d => d.p.value.entry.text);
            },
            exit => exit.remove()
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
    document.getElementById('idIndex').value = d.idObj;
    document.getElementById('category').value = d.category;
    document.getElementById('idGroup').value = d.idGroup;
    document.getElementById('idSource').value = d.idSource ? d.idSource : "";
    document.getElementById('idTarget').value = d.idTarget ? d.idTarget : "";
    document.getElementById('idLayer').value = data ? data.p.idLayer : entry.idLayer;
    document.getElementById('idEntry').value = data ? data.p.value.idEntry : entry.idEntry;
    if (d.idTarget) {
        //masque le sélectionneur de média
        document.getElementById('choixMedia').style.display = 'none';
        document.getElementById('btnIMajout').style.display = 'none';
        document.getElementById('btnIMmodif').style.display = 'block';
    } else {
        //affiche le sélectionneur de média
        document.getElementById('choixMedia').style.display = 'block';
        document.getElementById('btnIMajout').style.display = 'block';
        document.getElementById('btnIMmodif').style.display = 'none';
    }
    //vérifie si l'utilisateur à le droit de modifier
    if(d.idCreator != actant["o:id"]){
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
    mdEditIndex.open();

}

function addKeyframe(l, v, o) {
    //console.log(l);
    let idCat = l.id.split('_')[0];
    editDetail(null,null, {
        'idCat': idCat,
        'idEntry': v,
        'idCreator':actant["o:id"],
        'category': l.name,
        'idGroup': l.id,
        'idLayer':l.idLayer,    
        'text': "--",
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

function deleteDetail(e, d) {
    console.log(d);
}

