var config = {
	server:"/",
	app:function(name,username, picture, directory ){
		config.name=name;
		config.name=username;
		config.picture = picture;
		config.directory= directory;
	},
	users:function(room, people, me){
		var list = $$("contactsList");
		list.clearAll();
		if (config.name)
			list.add({ 
				id:-1, 
				img: config.picture, 
				title: config.name + " ( Sen )" });
		for (var key in people){
			var v = people[key];
			if(config.directory.indexOf(v.username) > -1 ){
				var temp = reqpicture(v.username ,v.easyrtcid);
				console.log(v.easyrtcid); 
				list.add ({
					id: v.easyrtcid,
					img: 'public/img/call.jpg',
					title: v.username
				});
			}
		}
	}
};

var contactsList = {
	header : "Rooms",
	view : "list",
	id : "contactsList",
	template : `
		<div id="#id#">
			<div class='contactPaneDiv'>
				<img class="contactIcon" src="#img#"/>
				<span class="contactTextDiv">#title#</span>
			</div>
		</div>
	`,
	item : {
		height: 80,
		width: 300,
	},
	select:true, scroll:false,
	on:{ onBeforeSelect: (id) => doCall(id) }
};

var chat = {
	css:"absarea",
	template:`<div class='mirrorDiv'><video id='mirrorVideo' width></div>
				<div class='windowToUniverseDiv'><video id='windowToUniverse'></div>`
};

function doConnect(config) {
	easyrtc.setVideoDims(640,480);
	easyrtc.setUsername (config.name);
	easyrtc.setRoomOccupantListener(config.users);
	easyrtc.setSocketUrl(config.server);
	easyrtc.easyApp("FaceTime", "mirrorVideo", ["windowToUniverse"], function(id){
		config.$userId = id
	}, function(code){

  		var text = "Bağlantı Hatası";
		if(code === "MEDIA_ERR") text += ". Yerel bir web kamerası bulamıyor";
		if(code === "MEDIA_WARNING") text += ". Video genişliği ve yüksekliği uygun değil";
		if(code === "SYSTEM_ERR") text += ". Ağ ayarlarınızı kontrol edin";
		if(code === "ALREADY_CONNECTED") text += ". Zaten bağlısınız ";

		webix.message({ type:"error", text: text});
		
	});
	
	easyrtc.setPeerClosedListener(function(){
		if ($$("endcall").isVisible()){
			$$("endcall").hide();
			$$("status").setValue("");
			webix.message("Bağlantınız kesildi");
		}
	});	
	easyrtc.setAcceptChecker( function(caller, cb) {
        var name = easyrtc.idToName(caller);
        var callback = function(wasAccepted) {
            if( wasAccepted){
            	if (easyrtc.getConnectionCount() > 0 )
                	easyrtc.hangupAll();
                $$("endcall").show();
                $$("status").setValue(name);
            }
            cb(wasAccepted);
        };

        if( easyrtc.getConnectionCount() > 0 )
        	webix.confirm({ text:" Mevcut aramayı bırak ve yeni olan aramayı kabul et " + name + " ?", callback });
        else
            webix.confirm({ text: "Gelen çağrıyı kabul et " + name + " ?", callback });

    });
}

function doCall(easyrtcid) {
	if (easyrtcid < 0) return false;
	
	$$("status").setValue("Connecting...")
	easyrtc.call(
		easyrtcid,
		function(caller) { 
			$$("endcall").show();
			var temp=easyrtc.idToName(caller)
			$$("status").setValue(temp);
			reqpicture(temp, easyrtcid);
		},
		function(errorMessage) { 
			webix.message({
				type:"error", text:errorMessage
			});
		},
		function(accepted, caller) {
			if (!accepted){
				webix.message(easyrtc.idToName(caller)+" aramanızı reddetti");
				$$("status").setValue("");
			}
		}
	);
}

webix.ready(function(){

	webix.ui({
		rows : [
			{ view:"toolbar", cols:[
				{ view:"label", label : "WebRTC Chat" },
				{},
				{ view:"label", id:"status", css:"status", value:"", width: 200 },
				{ view:"button", id:"endcall", value:"End Call", width: 100, click:function(){
					$$("endcall").hide();
					easyrtc.hangupAll();
					$$("contactsList").unselectAll()
					$$("status").setValue("");
				}, hidden:true }
			]},
			{ cols :[
				contactsList,
				chat
			]}
		]
	});
	doConnect(config);

});

