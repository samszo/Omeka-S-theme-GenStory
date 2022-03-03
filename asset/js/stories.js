let stories=[];


function initStories() {
    showListeStories();
    //gestion des boutons
    d3.select('#btnAjoutHistoire').on('click', function (e) {
    });
    mdWait = new jBox('Modal', {
        width: 200,
        height: 100,
        title: 'Patience...',
        content: '<div class="loading">' +
        '<p style="width:150px" >Merci de patienter...</p>' +
        '</div>'
    });
}

//fonction spécifiques à la page  
function saveHistoire(modif) {
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

function showListeStories() {
    d3.select('#ddmListeHistoire').selectAll('li').remove();
    d3.select('#ddmListeHistoire').selectAll('li').data(itemsStories).enter().append('li').append('a')
        .attr("class", "dropdown-item")
        .html((s, i) => {
            return s['o:title'];
        })
        .on('click', loadStory);
}

function loadStory(e, d) {
    let sc = document.getElementById('storyCard'+d['o:id']);
    if(!sc){
        stories.push(d);
        createStoriesCards();    
    } 
}
function reloadStory(e, d) {
    //suprime la carte
    d3.select("#storyCard"+d['o:id']).remove();
    let i = stories.map(s => s['o:id']).indexOf(d['o:id']);
    stories.splice(i, 1);
    getItem(d, function(data){
        loadStory(null, data);
    });
}
function editStory(e, d) {
    editItem(e, d, function(){
        reloadStory(e, d);
    })
}
function editProp(e, d) {
    if(d.type=='resource')editItem(e, d, null)
}

function deleteCard(e,d){
    stories = stories.filter(s=>s['o:id']!=d['o:id']); 
    createStoriesCards();
}

function createStoryRelations(e,d){
    if(window.confirm("Are you sure to transform texts into items ?")){
        mdWait.open();
        //transforme les texte en items
        $.ajax({
            type: 'POST',
            dataType: 'json',
            url: urlSite + '/page/ajax?helper=Scenario&type=createRelations&json=1',
            data: {'idItem':d['o:id'],'props':props.map(p=>p['o:term'])}
        }).done(function (data) {
            mdWait.close();
            reloadStory(e, data);
        })
        .fail(function (e) {
            console.log(e);
        })
        .always(function () {
            mdWait.close();
        });
    
    }
}

function createStoriesCards(){

    d3.select("#storiesCards").selectAll("div").remove();
    let card = d3.select("#storiesCards").selectAll("div").data(stories)
        .enter().append("div")
        .attr('id',s=>'storyCard'+s['o:id'])
        .attr("class", "card text-white bg-dark text-start m-2");
    let header = card.append('div').attr("class", "card-header");
    header.append('div').attr('class',"btn-toolbar").attr('role',"toolbar");
    //let grpB1 = header.append('div').attr('class',"btn-group me-2").attr('role',"group");
    header.append('button').attr('type',"button").attr('class',"btn btn-danger mx-2")
        .html('<i class="fa-solid fa-eye-slash"></i>')
        .attr('title','Hide story')
        .on('click',deleteCard)
    header.append('button').attr('type',"button").attr('class',"btn btn-danger mx-2")
        .html('<i class="fa-solid fa-marker"></i>')
        .attr('title','Edit story')
        .on('click',editStory)
    header.append('button').attr('type',"button").attr('class',"btn btn-danger mx-2")
        .attr('title','Reload story')
        .html('<i class="fa-solid fa-rotate"></i>')
        .on('click',reloadStory)
    header.append('button').attr('type',"button").attr('class',"btn btn-danger mx-2")
        .attr('title','Create relations')
        .html('<i class="fa-solid fa-diagram-project"></i>')
        .on('click',createStoryRelations)        

    card.append('img').attr('class',"card-img-top rounded mx-auto d-block")
        .style('max-width','fit-content')
        .attr('src',s=>s.thumbnail_display_urls.medium);
    let body = card.append('div').attr('class',"card-body");
    body.append('h4').attr('class',"card-title").html(s=>s['o:title']);
    body.append('p').attr('class',"card-text").html(s=>s["dcterms:description"][0]["@value"]);
    let lstProps = body.selectAll('div').data(s=>props.map(p=>{
        return {'p':p,'dt': s[p['o:term']] ? s[p['o:term']] : []}
    })).enter().append('div').attr('class','detailProps')
    lstProps.append('h5').html(d=>d.p['o:label']);
    let ul = lstProps.append('ul').attr('class',"list-group list-group-flush");
    ul.selectAll('li').data(p=>p.dt).enter().append('li').attr('class',"list-group-item")
        .style('cursor',d=>d.type=="resource" ? 'pointer':'none')
        .html(d=>d.type=="resource" ? 
            d["display_title"]+'<button class="btn btn-danger btn-sm mx-2"><i class="fa-solid fa-marker"></i></button>' 
            : d["@value"])
        .on('click',editProp);
    let footer = card.append('div').attr('class',"card-footer")
    footer.append('a').attr('class',"btn btn-danger").html('Create World');

}
