let user = false, mdWait;

function editItem(e,d,cbClose){
    console.log(e,d);
    let dt = d.data ? d.data : d;
    if(!d.modal){
        let t = e.currentTarget.id ? e.currentTarget.id : 'mainContent';
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

function getItem(d, cb){
    mdWait.open();
    //récupère les donnée de l'item
    $.ajax({
        type: 'GET',
        dataType: 'json',
        url: urlApi + '/items/'+d['o:id']
    }).done(function (data) {
        mdWait.close();
        cb(data);
    })
    .fail(function (e) {
        console.log(e);
    })
    .always(function () {
        mdWait.close();
    });

}

function getIframeItem(d){
    let url = actant ? urlAdmin+'/item/' : urlSite+'/item/';
    url += d['o:id'] ? d['o:id'] : d['value_resource_id']; 
    return `<iframe 
    width="600"
    height="600"
    src="${url}"></iframe>`;

}