/**
 * Created by yusuke on 2013/12/22.
 */

// APIキー
var APIKEY = '3bebf2ea-6ac4-11e3-9bff-4b748ebf39fb';

// ユーザーリスト
var userList = [];

// Callオブジェクト
var existingCall;

// Streamオブジェクト
var localStream;

// Peerjsから取り出したRTCPeerConnectionオブジェクト
var RTCPC;

// dtmfSenderオブジェクト
var dtmfSender;

// Compatibility
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

// PeerJSオブジェクトを生成
var peer = new Peer({ key: APIKEY, debug: 3});

// PeerIDを生成
peer.on('open', function(){
    $('#my-id').text(peer.id);
});

// 相手からのコールを受信したら自身のメディアストリームをセットして返答
peer.on('call', function(call){
    call.answer(localStream);
    dtmfSenderCreate();
    step3(call);
});

// エラーハンドラー
peer.on('error', function(err){
    console.log(err.message);
    step2();
});

// イベントハンドラー
$(function(){

    // 相手に接続
    $('#make-call').click(function(){
        var call = peer.call($('#contactlist').val(), localStream);
        step3(call);

    });

    // 切断
    $('#end-call').click(function(){
        existingCall.close();
        step2();
    });

    // メディアストリームを再取得
    $('#step1-retry').click(function(){
        $('#step1-error').hide();
        step1();
    });

    // トーン送信
    $('button').click(function(){
        if ($(this).hasClass('number-button')) {
            var number = $(this).text();
            if(existingCall){
                window.dtmfSender.insertDTMF(number);
            }
        }
    });

    $('#make-call').attr('disabled',true);
    $('#step2').hide();
    $('#step3').hide();

    // ステップ１実行
    step1();

    //ユーザリスト取得開始
    setInterval(getUserList, 2000);

});

function step1 () {
    // メディアストリームを取得する
    navigator.getUserMedia({audio: true, video: false}, function(stream){
        $('#my-audio').prop('src', URL.createObjectURL(stream));
        localStream = stream;
        step2();
    }, function(){ $('#step1-error').show(); });
}

function step2 () {
    existingCall = null;
    //UIコントロール
    $('#step1, #step3').hide();
    $('#step2').show();
}

function step3 (call) {
    // すでに接続中の場合はクローズする
    if (existingCall) {
        existingCall.close();
    }

    // 相手からのメディアストリームを待ち受ける
    call.on('stream', function(stream){
        $('#their-audio').prop('src', URL.createObjectURL(stream));
        dtmfSenderCreate();
    });

    // 相手がクローズした場合
    call.on('close',step2);

    // Callオブジェクトを保存
    existingCall = call;

    // UIコントロール
    $('#their-id').text(call.peer);
    $('#step1, #step2').hide();
    $('#step3').show();
    $('button').attr('disabled',false);

}

function getUserList () {
    //ユーザリストを取得
    $.get('https://skyway.io/active/list/'+APIKEY,
        function(list){
            for(var cnt = 0;cnt < list.length;cnt++){
                if($.inArray(list[cnt],userList)<0 && list[cnt] != peer.id){
                    userList.push(list[cnt]);
                    $('#contactlist').append($('<option>', {"value":list[cnt],"text":list[cnt]}));
                    $('#make-call').attr('disabled',false);
                }
            }
            if(list.length == 1){
                $('#make-call').attr('disabled',true);
            }
        }
    );
}

function dtmfSenderCreate(){
    localAudioTrack = localStream.getAudioTracks()[0];
    dtmfSender = RTCPC.createDTMFSender(localAudioTrack);
    dtmfSender.ontonechange = dtmfOnToneChange;
}

function dtmfOnToneChange(tone){
    //DTMFトーンを生成した時に発生する
    if (tone) {
        console.log("Sent Dtmf tone: \t" + tone.tone);
        $('#sended-dtmf').val($('#sended-dtmf').val() + tone.tone);
    }
}
