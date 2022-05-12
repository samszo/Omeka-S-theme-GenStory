let currentScenario, contextAudio;


function initVisios() {
    contextAudio = new AudioContext();
    showListeScenario();
    if(getScenario)chargeScenario(null,getScenario);
}

//fonction spécifiques à la page  
function showListeScenario() {
    d3.select('#ddmListeScenario').selectAll('li').remove();
    d3.select('#ddmListeScenario').selectAll('li').data(itemsScenario).enter().append('li').append('a')
        .attr("class", "dropdown-item")
        .html((s, i) => {
            return s['o:title'];
        })
        .on('click', (e,d)=>window.location = urlSite + '/page/scenarios?idScenario='+d['o:id']);        
        //.on('click', chargeScenario);
}

function chargeScenario(e, d) {
    if(currentScenario && currentScenario.timeliner)currentScenario.timeliner.hide();
    currentScenario = new scenario({
        'idConteneur':'mediaCards',
        'sgtProps':sgtProps,
        'sgtType':'locales',
        'rtTrack':'Scenario track',
        'idCard':'oa:hasSource',
        'resource':d,
        'actant':actant,    
        'urls': {
            'getItem':urlApi + '/items/',
            'creaTrack':urlSite + '/page/ajax?helper=Scenario&type=saveTrack&json=1',
            'addLayers':urlSite + '/page/ajax?helper=Scenario&type=addLayers&json=1',
            'gen':urlSite + '/page/ajax?helper=Scenario&type=genereScenario&json=1&gen=fromUti',
            'del':urlSite + '/page/ajax?helper=Scenario&type=deleteScenario&json=1&item_id=',
            'txtToObj':urlSite + '/page/ajax?helper=Scenario&type=scenarioTxtToObj&gen=fromUti&json=1',
            'delTrack':urlSite + '/page/ajax?helper=Scenario&type=deleteTrack&json=1',
            'delLayer':urlSite + '/page/ajax?helper=Scenario&type=deleteLayer&json=1',
            'mediaRender': urlSite + '/page/ajax?helper=mediaRender&json=1&id=',
        },
        'fonctions':{'showListeScenario':showListeScenario,'chargeScenario':chargeScenario, 'createMediaCard':'GenStory'},
        'scenarios':itemsScenario
    })
}
function createScenario() {
    currentScenario = new scenario({
        'actant':actant,    
        'urls': {'crea':urlSite + '/page/ajax?helper=Scenario&type=genereScenario&json=1&inScheme=groupByScopeSourceClass'},
        'fonctions':{'showListeScenario':showListeScenario,'chargeScenario':chargeScenario},
        'scenarios':itemsScenario
    })
}


