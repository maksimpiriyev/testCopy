let extensionId = "jdhbcgkbimldoffelfhhaacokdfafdfn";

const DataType = {
  CONNECT:   0,
  DEVICELIST:   1,
  PING: 2,
  SEND: 3,
  LOST: 4,
};

class Data {
  constructor(id,type, received,toSend,device,deviceList) {
    this.deviceId = id;
    this.type = type;
    this.received = received;
    this.toSend = toSend;
    this.baudrate = 115200;
    this.deviceList = deviceList;
    this.device = id;
  }
}

// class Connection {
//   constructor() {
//     this.id = id;
//     this.readBuffer = "";
//     this.sendBuffer = "";
//     this.bitrate = 115200;
//   }
//   get isConnected() {
//     return this.id != -1;
//   }
//   // Method
//   transmit() {
//     if(this.sendBuffer.length == 0) return;
//     var uint8array = new TextEncoder("utf-8").encode(this.sendBuffer);
//     var buffer = new ArrayBuffer(uint8array.length);
//     var uint8View = new Uint8Array(buffer);
//     for (var i = 0; i < this.sendBuffer.length; i++) {
//       uint8View[i] = uint8array[i];
//     }
//     chrome.serial.write(connection.id, buffer, function() {});
//     this.sendBuffer = "";
//   }
// }

class Settings {
  constructor() {
    this.baudrate = 115200;
    this.power = '';
    this.mode = 7;
    this.maxDelay = '';
    this.minLength = '';
    this.isMavlinkRssi = true;
    this.isMavlinkSwarm = false;
    this.isMesh = false;
    this.isRepeater = false;
    this.isEncryptionEnabled = false;
    this.isMesh4Bytes = false;
    this.isMeshSourceEmit = false;
    this.meshId = '';
    this.encKey = '';
    this.chachaKey = '';
    this.maxRetransmitCount = 1;
    this.isMavlinkNeverLost = false;
    this.neverLostMode = 1;
    this.mavlinkNeverLostCommand = [0,'','','','','','',''];
  }
}
function bool(v) {
  return v == true || v == 'true';
}
function parseIntx(v){
  if(v == '') return 0;
  return parseInt(v);
}
function numerize(s){
  s.baudrate = parseIntx(s.baudrate + '');
  s.power = parseIntx(s.power + '');
  s.mode = parseIntx(s.mode + '');
  s.frequency = parseIntx(s.frequency + '');
  s.neverLostInterval = parseIntx(s.neverLostInterval + '');
  s.maxDelay = parseIntx(s.maxDelay + '');
  s.minLength = parseIntx(s.minLength + '');
  s.isMavlinkRssi = bool(s.isMavlinkRssi + '');
  s.isMavlinkSwarm = bool(s.isMavlinkSwarm );
  s.isMesh = bool(s.isMesh + '');
  s.meshId = parseIntx(s.meshId + '');
  s.isMavlinkNeverLost = bool(s.isMavlinkNeverLost + '');
  s.neverLostMode = parseIntx(s.neverLostMode + '');
  for (var i=0; i < s.mavlinkNeverLostCommand.length;i++){
    s.mavlinkNeverLostCommand[i] = parseIntx(s.mavlinkNeverLostCommand[i] + '');
  }
}
function getDiff(a, b){
  var diff = (isArray(a) ? [] : {});
  recursiveDiff(a, b, diff);
  return diff;
}

function recursiveDiff(a, b, node){
  // dump(diff);
  var checked = [];

  for(var prop in a){
    // debug(prop, 1);
    if(typeof b[prop] == 'undefined'){
      addNode(prop, '[[removed]]', node);
    }
    else if(JSON.stringify(a[prop]) != JSON.stringify(b[prop])){
      // debug(typeof b[prop], 2);
      // if value
      if(typeof b[prop] != 'object' || b[prop] == null){
        addNode(prop, b[prop], node);
        // debug("(added)", 3);
      }
      else {
        // if array
        if(isArray(b[prop])){
          addNode(prop, [], node);
          recursiveDiff(a[prop], b[prop], node[prop]);
        }
        // if object
        else {
          addNode(prop, {}, node);
          recursiveDiff(a[prop], b[prop], node[prop]);
        }
      }
    }
  }
}

function addNode(prop, value, parent){
  parent[prop] = value;
}

function isArray(obj){
  return (Object.prototype.toString.call(obj) === '[object Array]');
}

function arrayToString(a,maxLength){
  var rtn = "";
  for(var i=0;i<Math.min(a.length,maxLength);i++){
    if(i>0) rtn +=","
    rtn += a[i];
  }
  return rtn;
}

function stringToArray(a){
  var t = a.split(",");
  var rtn = [];
  for(var i=0;i<t.length;i++){
    rtn.push(parseIntx(t[i]));
  }
  return rtn;
}
var device;
var app = angular.module('ZoonApp',[]);
app.directive('ngEnter', function () {
  return function (scope, element, attrs) {
    element.bind("keydown keypress", function (event) {
      if(event.which === 13) {
        scope.$apply(function (){
          scope.$eval(attrs.ngEnter);
        });

        event.preventDefault();
      }
    });
  };
});
app.controller('ZoonCtrl', function ($scope,$interval) {

  $scope.settings = new Settings();
  $scope.prevSettings = new Settings();
  $scope.mavlinkNeverLostCommand = ['','','','','','','',''];
  // $scope.power = '';
  // $scope.frequency = '';
  // $scope.meshId = '';
  $scope.baudrate = 115200;
  // $scope.deviceList = [
  //   {path : "/dev/ttyACM1", color : "red"},
  //   {path : "/dev/ttyACM2", color : "white"},
  //   {path : "/dev/ttyACM3", color : "black"}
  // ];


  $scope.id = -1;
  $scope.isConfig = false;
  $scope.device = "/dev/ttyACM1";
  $scope.deviceList = ["/dev/ttyACM1","/dev/ttyACM2"];
  $scope.modes = [0,1,2,3,4,5,6,7,8,9,10];
  $scope.fecs = [{ name:"4/5(25%)",value:0},{ name:"4/6(50%)",value:1},{ name:"4/7(75%)",value:2} ];
  $scope.isSettings = true;
  $scope.selectTab = function(i){
    if($scope.isConfig) return;
    $scope.isSettings = i == 1;
  };
  $scope.cmdMap = null;
  $scope.commandName = function(id){
    if(id+"" == "") return;
    id = parseInt(id+"");
    if($scope.cmdMap == null){
      $scope.cmdMap = new Map();
      for (let i = 0; i < $scope.CMDS.length; i++) {
        $scope.cmdMap.set($scope.CMDS[i].value,$scope.CMDS[i].name);
      }
    }
    if($scope.cmdMap.has(id))
      return $scope.cmdMap.get(id);

    return "";
  };
  $scope.showEstimation = function(){};
  $scope.connect = function(){
    var dd = new Data($scope.device,DataType.CONNECT,"","",$scope.device);
    dd.baudrate = parseInt($scope.baudrate+'');
    chrome.runtime.sendMessage(extensionId, dd,function(d){
      $scope.id = d.deviceId;
      $scope.device = $scope.device;
    });
    //connectAsync();
    // navigator.usb.requestDevice({ filters: [{ vendorId: 0x483 }] })
    //   .then(selectedDevice => {
    //     device = selectedDevice;
    //     return device.open(); // Begin a session.
    //   })
    //   .then(() => device.selectConfiguration(1)) // Select configuration #1 for the device.
    //   .then(() => device.claimInterface(0)) // Request exclusive control over interface #2.
    //   .then(() => device.controlTransferOut({
    //     requestType: 'class',
    //     recipient: 'interface',
    //     request: 0x22,
    //     value: 0x01,
    //     index: 0x02})) // Ready to receive data
    //   .then(() => device.transferIn(5, 64)) // Waiting for 64 bytes of data from endpoint #5.
    //   .then(result => {
    //     let decoder = new TextDecoder();
    //     console.log('Received: ' + decoder.decode(result.data));
    //   })
    //   .catch(error => { console.log(error); });
  };
  $scope.readAll = function(){
    if($scope.isConfig && !$scope.isExtension) return;

    if($scope.hasSent){
      alert("ZOON is in data transmit/receive mode! Please replug ZOON and restart this application!");
      return;
    }


    $scope.hasSent = true;
    $scope.text = "DRONEE-ZOON";
    $scope.send();
    $scope.isConfig = true;
    chrome.runtime.sendMessage(extensionId, new Data($scope.device,DataType.PING,"","DATA-ZOON"),function(d){
      $scope.readBuffer += d.received;
      $scope.process();
    });


  };

  $scope.isSetToWriteAll = false;
  $scope.writeAll = function(){
    numerize($scope.settings);
    numerize($scope.prevSettings);
    $scope.settings.chachaKey = stringToArray($scope.settings.encKey);
    $scope.prevSettings.chachaKey = stringToArray($scope.prevSettings.encKey);
    var d = getDiff($scope.prevSettings,$scope.settings);
    $scope.text = ""+JSON.stringify(d)+" ";
    $scope.isSetToWriteAll = true;
    $scope.send();
    //generate json
    // write to webusb
    //reread settings json

  };
  $scope.text = "";
  $scope.sendBuffer = "";
  $scope.readBuffer = "";
  $scope.hasSent = false;
  $scope.send = function(txt){
    if($scope.text.length == 0 ) return;
    if($scope.isConfig && txt == true){
      alert("ZOON is in config mode! Please replug ZOON and restart this application!");
      return;
    }
    if(txt != undefined && txt == true) {
      $scope.hasSent = true;
    }
    chrome.runtime.sendMessage(extensionId, new Data($scope.device,DataType.PING,"",$scope.text),function(d){
      $scope.readBuffer += d.received;
      $scope.process();
    });
    $scope.text = "";
  };

  $scope.isFirstTimeConfig = true;
  $scope.process = function(){
    if($scope.isConfig){
      var start = 0;
      for (let i = 0; i < $scope.readBuffer.length; i++) {
        if($scope.readBuffer.charAt(i) == '{'){ start = i;}
        if($scope.readBuffer.charAt(i) == '}'){
          var txt = $scope.readBuffer.substring(start,i+1);
          //$scope.settings = JSON.parse(txt);
          if($scope.isSetToWriteAll == false || ($scope.isSetToWriteAll && $scope.isFirstTimeConfig == false) ) {
            for(var j=txt.length-1;j>=0;j--){
               if(txt[j] == ':') break;
               if(txt[j] == ','){
                 txt = txt.substring(0,j)  + txt.substring(j+1);
                 break;
               }
             }
            $scope.settings = JSON.parse(txt);
            $scope.prevSettings = JSON.parse(txt);
            $scope.settings.encKey = arrayToString($scope.settings.chachaKey,30);
            $scope.prevSettings.encKey = arrayToString($scope.prevSettings.chachaKey,30);
            $scope.$apply();
          }
          $scope.readBuffer = $scope.readBuffer.substr(i+1);
          $scope.$apply();
          if($scope.isSetToWriteAll ){
            $scope.isSetToWriteAll = false;
            if($scope.isFirstTimeConfig){
              $scope.isFirstTimeConfig = false;
              $scope.writeAll();
            }else {
              alert("SETTINGS WERE WRITTEN TO ZOON SUCCESFULLY!");
            }

          }
        }
      }
    }
  };



  $scope.isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
  $scope.isExtension = true;
  $scope.retreiveDeviceList = function(){
    chrome.runtime.sendMessage(extensionId, new Data($scope.device,DataType.DEVICELIST),function(d){
      $scope.deviceList = d.deviceList;
      if(d.deviceList != undefined && d.deviceList.length > 0){
        $scope.device = d.deviceList[0];
      }
      $scope.$apply();
    });

  };

  $scope.isDeviceListRetrieved = false;
  $scope.ping = function(){
    var port = chrome.runtime.sendMessage(extensionId, new Data($scope.device,DataType.PING),function(d){
      var lastError = chrome.runtime.lastError;
      if (lastError || d === undefined) {
        $scope.isExtension = false;
        $scope.$apply();
        // console.log(lastError.message);

      } else{
        if(d.received != undefined && d.received != null) {
          $scope.readBuffer += d.received;
          if(!$scope.isConfig && d.received.length > 0){
            $scope.receiveText = $scope.readBuffer;

          }
          $scope.process();
          $scope.$apply();
        }
        $scope.id = d.deviceId;
        if($scope.id == -1){
          $scope.isConfig = false;
          $scope.hasSent = false;
          $scope.receiveText = "";
          $scope.settings = new Settings();
        }
        if(!$scope.isDeviceListRetrieved ){
          $scope.isDeviceListRetrieved = true;
          $scope.retreiveDeviceList();
        }
      }
    });
  };
  $scope.pingInterrupt = $interval( function(){ 
    $scope.ping();
   }, 100);


  $scope.baudrateConnectChanged = function(){

  };

  $scope.baudrateSettingsChanged = function(){

  };

  $scope.MODES =  [
    { name:"kHz203" ,  sf:"SF12", bandwith:203    , bitrate: 0.595  ,sensitivity:-130    ,mode:0},
    { name:"kHz406" ,  sf:"SF11", bandwith:406   , bitrate: 2.18    ,sensitivity:-125    ,mode:1},
    { name:"kHz203" ,  sf:"SF8",  bandwith:203 , bitrate: 6.34      ,sensitivity:-118    ,mode:2},
    { name:"kHz406" ,  sf:"SF8",  bandwith:406 , bitrate: 12.69     ,sensitivity:-116    ,mode:3},
    { name:"kHz812" ,  sf:"SF8",  bandwith:812 , bitrate: 25.38     ,sensitivity:-115    ,mode:4},
    { name:"kHz203" ,  sf:"SF5",  bandwith:203 , bitrate: 31.72     ,sensitivity:-109    ,mode:5},
    { name:"kHz812" ,  sf:"SF7",  bandwith:812 , bitrate: 44.41     ,sensitivity: -112    ,mode:6},
    { name:"kHz812" ,  sf:"SF6",  bandwith:812 , bitrate: 76.13     ,sensitivity:-108    ,mode:7},
    { name:"kHz812" ,  sf:"SF5",  bandwith:812 , bitrate: 126.88    ,sensitivity:-105    ,mode:8},
    { name:"kHz1625",  sf:"SF6",  bandwith:1625, bitrate: 152.34    ,sensitivity:-103    ,mode:9},
    { name:"kHz1625",  sf:"SF5",  bandwith:1625, bitrate: 253.91    ,sensitivity:-99     ,mode:10 }

  ];

  $scope.CMDS = [ { name:"ACTUATOR_CONTROL_TARGET", value: 140 }, { name:"ADAP_TUNING", value: 11010 }, { name:"ADSB_VEHICLE", value: 246 }, { name:"AHRS", value: 163 }, { name:"AHRS2", value: 178 }, { name:"AHRS3", value: 182 }, { name:"AIRSPEED_AUTOCAL", value: 174 }, { name:"ALTITUDE", value: 141 }, { name:"AOA_SSA", value: 11020 }, { name:"AP_ADC", value: 153 }, { name:"ATTITUDE", value: 30 }, { name:"ATTITUDE_QUATERNION", value: 31 }, { name:"ATTITUDE_QUATERNION_COV", value: 61 }, { name:"ATTITUDE_TARGET", value: 83 }, { name:"ATT_POS_MOCAP", value: 138 }, { name:"AUTH_KEY", value: 7 }, { name:"AUTOPILOT_VERSION", value: 148 }, { name:"AUTOPILOT_VERSION_REQUEST", value: 183 }, { name:"BATTERY2", value: 181 }, { name:"BATTERY_STATUS", value: 147 }, { name:"BUTTON_CHANGE", value: 257 }, { name:"CAMERA_CAPTURE_STATUS", value: 262 }, { name:"CAMERA_FEEDBACK", value: 180 }, { name:"CAMERA_IMAGE_CAPTURED", value: 263 }, { name:"CAMERA_INFORMATION", value: 259 }, { name:"CAMERA_SETTINGS", value: 260 }, { name:"CAMERA_STATUS", value: 179 }, { name:"CAMERA_TRIGGER", value: 112 }, { name:"CHANGE_OPERATOR_CONTROL", value: 5 }, { name:"CHANGE_OPERATOR_CONTROL_ACK", value: 6 }, { name:"COLLISION", value: 247 }, { name:"COMMAND_ACK", value: 77 }, { name:"COMMAND_INT", value: 75 }, { name:"COMMAND_LONG", value: 76 }, { name:"COMPASSMOT_STATUS", value: 177 }, { name:"CONTROL_SYSTEM_STATE", value: 146 }, { name:"DATA16", value: 169 }, { name:"DATA32", value: 170 }, { name:"DATA64", value: 171 }, { name:"DATA96", value: 172 }, { name:"DATA_STREAM", value: 67 }, { name:"DATA_TRANSMISSION_HANDSHAKE", value: 130 }, { name:"DEBUG", value: 254 }, { name:"DEBUG_VECT", value: 250 }, { name:"DEEPSTALL", value: 195 }, { name:"DEVICE_OP_READ", value: 11000 }, { name:"DEVICE_OP_READ_REPLY", value: 11001 }, { name:"DEVICE_OP_WRITE", value: 11002 }, { name:"DEVICE_OP_WRITE_REPLY", value: 11003 }, { name:"DIGICAM_CONFIGURE", value: 154 }, { name:"DIGICAM_CONTROL", value: 155 }, { name:"DISTANCE_SENSOR", value: 132 }, { name:"EKF_STATUS_REPORT", value: 193 }, { name:"ENCAPSULATED_DATA", value: 131 }, { name:"ESTIMATOR_STATUS", value: 230 }, { name:"EXTENDED_SYS_STATE", value: 245 }, { name:"FENCE_FETCH_POINT", value: 161 }, { name:"FENCE_POINT", value: 160 }, { name:"FENCE_STATUS", value: 162 }, { name:"FILE_TRANSFER_PROTOCOL", value: 110 }, { name:"FLIGHT_INFORMATION", value: 264 }, { name:"FOLLOW_TARGET", value: 144 }, { name:"GIMBAL_CONTROL", value: 201 }, { name:"GIMBAL_REPORT", value: 200 }, { name:"GIMBAL_TORQUE_CMD_REPORT", value: 214 }, { name:"GLOBAL_POSITION_INT", value: 33 }, { name:"GLOBAL_POSITION_INT_COV", value: 63 }, { name:"GLOBAL_VISION_POSITION_ESTIMATE", value: 101 }, { name:"GOPRO_GET_REQUEST", value: 216 }, { name:"GOPRO_GET_RESPONSE", value: 217 }, { name:"GOPRO_HEARTBEAT", value: 215 }, { name:"GOPRO_SET_REQUEST", value: 218 }, { name:"GOPRO_SET_RESPONSE", value: 219 }, { name:"GPS2_RAW", value: 124 }, { name:"GPS2_RTK", value: 128 }, { name:"GPS_GLOBAL_ORIGIN", value: 49 }, { name:"GPS_INJECT_DATA", value: 123 }, { name:"GPS_INPUT", value: 232 }, { name:"GPS_RAW_INT", value: 24 }, { name:"GPS_RTCM_DATA", value: 233 }, { name:"GPS_RTK", value: 127 }, { name:"GPS_STATUS", value: 25 }, { name:"HEARTBEAT", value: 0 }, { name:"HIGHRES_IMU", value: 105 }, { name:"HIGH_LATENCY", value: 234 }, { name:"HIL_ACTUATOR_CONTROLS", value: 93 }, { name:"HIL_CONTROLS", value: 91 }, { name:"HIL_GPS", value: 113 }, { name:"HIL_OPTICAL_FLOW", value: 114 }, { name:"HIL_RC_INPUTS_RAW", value: 92 }, { name:"HIL_SENSOR", value: 107 }, { name:"HIL_STATE", value: 90 }, { name:"HIL_STATE_QUATERNION", value: 115 }, { name:"HOME_POSITION", value: 242 }, { name:"HWSTATUS", value: 165 }, { name:"LANDING_TARGET", value: 149 }, { name:"LED_CONTROL", value: 186 }, { name:"LIMITS_STATUS", value: 167 }, { name:"LOCAL_POSITION_NED", value: 32 }, { name:"LOCAL_POSITION_NED_COV", value: 64 }, { name:"LOCAL_POSITION_NED_SYSTEM_GLOBAL_OFFSET", value: 89 }, { name:"LOGGING_ACK", value: 268 }, { name:"LOGGING_DATA", value: 266 }, { name:"LOGGING_DATA_ACKED", value: 267 }, { name:"LOG_DATA", value: 120 }, { name:"LOG_ENTRY", value: 118 }, { name:"LOG_ERASE", value: 121 }, { name:"LOG_REQUEST_DATA", value: 119 }, { name:"LOG_REQUEST_END", value: 122 }, { name:"LOG_REQUEST_LIST", value: 117 }, { name:"MAG_CAL_PROGRESS", value: 191 }, { name:"MAG_CAL_REPORT", value: 192 }, { name:"MANUAL_CONTROL", value: 69 }, { name:"MANUAL_SETPOINT", value: 81 }, { name:"MEMINFO", value: 152 }, { name:"MEMORY_VECT", value: 249 }, { name:"MESSAGE_INTERVAL", value: 244 }, { name:"MISSION_ACK", value: 47 }, { name:"MISSION_CLEAR_ALL", value: 45 }, { name:"MISSION_COUNT", value: 44 }, { name:"MISSION_CURRENT", value: 42 }, { name:"MISSION_ITEM", value: 39 }, { name:"MISSION_ITEM_INT", value: 73 }, { name:"MISSION_ITEM_REACHED", value: 46 }, { name:"MISSION_REQUEST", value: 40 }, { name:"MISSION_REQUEST_INT", value: 51 }, { name:"MISSION_REQUEST_LIST", value: 43 }, { name:"MISSION_REQUEST_PARTIAL_LIST", value: 37 }, { name:"MISSION_SET_CURRENT", value: 41 }, { name:"MISSION_WRITE_PARTIAL_LIST", value: 38 }, { name:"MOUNT_CONFIGURE", value: 156 }, { name:"MOUNT_CONTROL", value: 157 }, { name:"MOUNT_ORIENTATION", value: 265 }, { name:"MOUNT_STATUS", value: 158 }, { name:"NAMED_VALUE_FLOAT", value: 251 }, { name:"NAMED_VALUE_INT", value: 252 }, { name:"NAV_CONTROLLER_OUTPUT", value: 62 }, { name:"OPTICAL_FLOW", value: 100 }, { name:"OPTICAL_FLOW_RAD", value: 106 }, { name:"PARAM_MAP_RC", value: 50 }, { name:"PARAM_REQUEST_LIST", value: 21 }, { name:"PARAM_REQUEST_READ", value: 20 }, { name:"PARAM_SET", value: 23 }, { name:"PARAM_VALUE", value: 22 }, { name:"PID_TUNING", value: 194 }, { name:"PING", value: 4 }, { name:"PLAY_TUNE", value: 258 }, { name:"POSITION_TARGET_GLOBAL_INT", value: 87 }, { name:"POSITION_TARGET_LOCAL_NED", value: 85 }, { name:"POWER_STATUS", value: 125 }, { name:"RADIO", value: 166 }, { name:"RADIO_STATUS", value: 109 }, { name:"RALLY_FETCH_POINT", value: 176 }, { name:"RALLY_POINT", value: 175 }, { name:"RANGEFINDER", value: 173 }, { name:"RAW_IMU", value: 27 }, { name:"RAW_PRESSURE", value: 28 }, { name:"RC_CHANNELS", value: 65 }, { name:"RC_CHANNELS_OVERRIDE", value: 70 }, { name:"RC_CHANNELS_RAW", value: 35 }, { name:"RC_CHANNELS_SCALED", value: 34 }, { name:"REMOTE_LOG_BLOCK_STATUS", value: 185 }, { name:"REMOTE_LOG_DATA_BLOCK", value: 184 }, { name:"REQUEST_DATA_STREAM", value: 66 }, { name:"RESOURCE_REQUEST", value: 142 }, { name:"RPM", value: 226 }, { name:"SAFETY_ALLOWED_AREA", value: 55 }, { name:"SAFETY_SET_ALLOWED_AREA", value: 54 }, { name:"SCALED_IMU", value: 26 }, { name:"SCALED_IMU2", value: 116 }, { name:"SCALED_IMU3", value: 129 }, { name:"SCALED_PRESSURE", value: 29 }, { name:"SCALED_PRESSURE2", value: 137 }, { name:"SCALED_PRESSURE3", value: 143 }, { name:"SENSOR_OFFSETS", value: 150 }, { name:"SERIAL_CONTROL", value: 126 }, { name:"SERVO_OUTPUT_RAW", value: 36 }, { name:"SETUP_SIGNING", value: 256 }, { name:"SET_ACTUATOR_CONTROL_TARGET", value: 139 }, { name:"SET_ATTITUDE_TARGET", value: 82 }, { name:"SET_GPS_GLOBAL_ORIGIN", value: 48 }, { name:"SET_HOME_POSITION", value: 243 }, { name:"SET_MAG_OFFSETS", value: 151 }, { name:"SET_MODE", value: 11 }, { name:"SET_POSITION_TARGET_GLOBAL_INT", value: 86 }, { name:"SET_POSITION_TARGET_LOCAL_NED", value: 84 }, { name:"SIMSTATE", value: 164 }, { name:"SIM_STATE", value: 108 }, { name:"STATUSTEXT", value: 253 }, { name:"STORAGE_INFORMATION", value: 261 }, { name:"SYSTEM_TIME", value: 2 }, { name:"SYS_STATUS", value: 1 }, { name:"TERRAIN_CHECK", value: 135 }, { name:"TERRAIN_DATA", value: 134 }, { name:"TERRAIN_REPORT", value: 136 }, { name:"TERRAIN_REQUEST", value: 133 }, { name:"TIMESYNC", value: 111 }, { name:"UAVIONIX_ADSB_OUT_CFG", value: 10001 }, { name:"UAVIONIX_ADSB_OUT_DYNAMIC", value: 10002 }, { name:"UAVIONIX_ADSB_TRANSCEIVER_HEALTH_REPORT", value: 10003 }, { name:"V2_EXTENSION", value: 248 }, { name:"VFR_HUD", value: 74 }, { name:"VIBRATION", value: 241 }, { name:"VICON_POSITION_ESTIMATE", value: 104 }, { name:"VISION_POSITION_DELTA", value: 11011 }, { name:"VISION_POSITION_ESTIMATE", value: 102 }, { name:"VISION_SPEED_ESTIMATE", value: 103 }, { name:"WIND", value: 168 }, { name:"WIND_COV", value: 231 } ];


});


// async function connectAsync() {
//   device = await navigator.usb.requestDevice({ 'filters': [] });
//   console.log(device);
//
//   await device.open();
//   if (device.configuration === null) {
//     await device.selectConfiguration(1);
//   }
//   await device.claimInterface(0);
//   await device.selectAlternateInterface(0, 0);
//   // await device.controlTransferOut({
//   //   requestType: "vendor",
//   //   recipient: "device",
//   //   request: 3 /* FTDI_SIO_SET_BAUDRATE_REQUEST */,
//   //   value: 16696, // divisor_value
//   //   index: 48000000 // divisor_index
//   // });
//   let result = await device.transferIn(1, 1);
//   console.log((new TextDecoder).decode(result.data));
// }


