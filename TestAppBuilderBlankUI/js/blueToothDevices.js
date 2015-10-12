//Start:  Bluetooth.StartScan(baseline, isDebug);
//Tare:   Bluetooth.ChangeTare(baseline);
//Stop:   Bluetooth.StopScan();
//Result: function onShowWeights(weights, baseline, isDebug) { weights[0].average_weight + ' | ' + weights[0].total_reads + ' | ' + weights[0].total_weight  + ' | ' + weights[0].baseline}
var Bluetooth =
            (function (_bluetooth) {
                
                this._baseline = 4786000;                
                this._isDebug = false;
                
                 function changeTare(value) {
                    _baseline = parseInt(value);
                    BlueToothDevices.ChangeBaseline(_baseline);                    
                    return _baseline;
                }
                
                function startScan(baseline, callback, isDebug) {
                    if(baseline === undefined) baseline = this._baseline;
                    if(isDebug === undefined) isDebug = this._isDebug;
                    BlueToothDevices.StartScan(baseline, isDebug, BlueToothDevices.onDeviceScan, callback);                  
                }
                
                function stopScan(isDebug) {
                     BlueToothDevices.StopScan(isDebug);                  
                }
               
                
                //define public methods
                _bluetooth.StartScan = startScan;
                _bluetooth.StopScan = stopScan;
                _bluetooth.ChangeTare = changeTare;
                
                return _bluetooth;

})(Bluetooth || (Bluetooth = {}));
            


var BlueToothDevices = {

   GetWeights: function(read, variance, baseline, callback, isDebug)
   {
       if(read <0) read = 0;
       
        if(this._weights === undefined || this._weights === null)
        {
            this._weights = [];
        }
        
        if(this._weights.length === 0)
        {
            this._weights.push({ average_weight: read, total_reads: 1, total_weight: read, variance: variance, baseline: baseline, start_date: new Date(), end_date: new Date() });
        }
        else
        {  
            this._weights[0].end_date = new Date();            
            var weight = this._weights[0];
            
            if( (weight.end_date.getTime() - weight.start_date.getTime()) <= 1000)
            {              
                 var weight_variance = (variance / 1000).toFixed(1); //variance is passed in as milligrams and converted to grams.
                
                if( ((weight.average_weight + weight_variance) >= read) || ((weight.average_weight - weight_variance) <= read) )
                {
                    weight.variance =  weight_variance;
                    
                     weight.total_reads +=1;
                    
                     weight.total_weight += read;
                
                     weight.average_weight = ( (weight.total_weight / 1000) / (weight.total_reads) ).toFixed(1); //convert results to grams
                    
                     weight.baseline = baseline;
                    
                     this._weights[0] = weight;
                    
                     BlueToothDevices.Debug('Added Weight: ' + JSON.stringify(this._weights), isDebug);
                }
            }
            else
            {
                var callbackWeights = this._weights;
                
                this._weights = [];
                
                if (typeof callback === "function") {
                    callback(callbackWeights);
                 }
            }
        }
       
        BlueToothDevices.Debug('GetWeight: ' + JSON.stringify(this._weights), isDebug);
       
        return this._weights;
   },
   ListDevices: function(isDebug)
   {
        if(this._devices === undefined || this._devices === null)
        {
            this._devices = [];
        }
       
        BlueToothDevices.Debug('Listing devices: ' + JSON.stringify(this._devices, isDebug));
        return this._devices;
   },
   AddDevice: function(device, isDebug)
    {
        if(device !== undefined && device.id !== undefined)
        {
            BlueToothDevices.Debug('Before adding device: ' + JSON.stringify(device), isDebug);
            
            var devices = BlueToothDevices.ListDevices();
            var found = false;
            
            for (var i=0; i <devices.length; i++) {
                if (devices[i].id === device.id) {
                    found = true;
                    break;
                }
            }
            
            if(!found)
            {
                this._devices.push(device);
                BlueToothDevices.Debug('Added device: ' + JSON.stringify(device), isDebug);
            }
       }
        
    },
    ChangeBaseline : function(baseline)
    {
        if(baseline === undefined || baseline === null)
        {
            this._baseline = 4783280; // default baseline value
        }
        else
        {
            this._baseline = baseline;
        }
    }, 
    ReadBaseline : function()
    {
        return this._baseline;
    },    
    ProcessResult: function(input, baseline, isDebug, variance, callback)
    {
         //var baseline = 4783280;
         var result = ((input) - baseline); //(parseInt(input) - baseline);
         BlueToothDevices.Debug('ProcessResult: ' + result, isDebug);
         BlueToothDevices.GetWeights(result, variance, baseline, callback, isDebug);
         return result;
    },
    RunBle: function(baseline, isDebug)
    {
            if(ble){
                
                BlueToothDevices.Debug("ble plugin initialized!", isDebug);
                
                BlueToothDevices.ChangeBaseline(baseline);
                
                BlueToothDevices.StartScan(baseline, isDebug);
                
            } 
            else {
               BlueToothDevices.Debug("plugin not initialized!", isDebug);
            }              
    },
    StartScan:function(baseline, isDebug, callback1, callback2)
    {
            try{
                 BlueToothDevices.Debug("Before scanning for ble devices" + JSON.stringify({baseline: baseline, isDebug: isDebug, f1: callback1.name ,f2: callback2.name}), isDebug); 
                
                BlueToothDevices.ChangeBaseline(baseline);
                    
                    ble.startScan([], function(device) {
                    
                            BlueToothDevices.Debug("Started scanning blue tooth", isDebug);
                        
                            if (typeof callback2 === "function") {
                                this._ProcessResult = callback2;
                            }
                        
                            if(device !== undefined && device.id !== undefined)
                            {
                                // Make sure the callback is a function​
                                if (typeof callback1 === "function") {
                                        BlueToothDevices.Debug('StartScan Callback1 Device > ' + JSON.stringify(device) , isDebug);
                                        callback1(device, baseline, isDebug);
                                }
                                else {
                                        if(device.name !== undefined)
                                        {
                                                BlueToothDevices.Debug(JSON.stringify(device) , isDebug);
                                                //var item = device.name + '-' + device.id + '-' + device.rssi;
                                                var deviceName = (device.name);
                                                var deviceId = device.id;
                                            
                                                if(deviceName.indexOf("Bake Scale PRO") > -1)
                                                {
                                                    BlueToothDevices.Connect(deviceId, baseline, isDebug);                        
                                                }
                                        }
                               }
                           }
                                
                    }, function() { BlueToothDevices.Debug("StartScan>failed to start scan", isDebug); });               
                  
            }
            catch(e)
            {
                var errorMessage  = "StartScan> error on startScan";
                BlueToothDevices.Debug(errorMessage, isDebug);
                errorMessage  = BlueToothDevices.ToString(e);
                BlueToothDevices.Debug('StartScan> ' + errorMessage, isDebug);
            }
        
        return false;
    },
    Connect: function(deviceId, baseline, isDebug, callback)
    {
        try{
            ble.connect(deviceId, 
                                    function() { 
                                                    BlueToothDevices.Debug("Connect - successful", isDebug);  
                                        
                                                    if (typeof callback === "function") {
                                                        
                                                         BlueToothDevices.Debug("Connect> Callback Function", isDebug);
                                                        
                                                         callback({
                                                             device_id:deviceId, service_uuid:'1bc50001-0200-0aa5-e311-24cb004a98c5', 
                                                             characteristic_uuid:'1bc50002-0200-0aa5-e311-24cb004a98c5', 
                                                             baseline:baseline, isDebug:isDebug
                                                         });   
                                                            
                                                     }
                                                     else {
                                                            BlueToothDevices.Debug("Connect> BlueToothDevices.ProcessResult", isDebug);
                                                         
                                                            ble.read(deviceId, '1bc50001-0200-0aa5-e311-24cb004a98c5', '1bc50002-0200-0aa5-e311-24cb004a98c5', 
                                                                function(buffer) { 
                                                                                    var data = new Int32Array(buffer);
                                                                                    var result = BlueToothDevices.ToHexadecimal(data);
                                                                                    BlueToothDevices.Debug("Read data baseline: " + BlueToothDevices.ReadBaseline() + ", result: " + result, isDebug);
                                                                                    BlueToothDevices.ProcessResult(result, BlueToothDevices.ReadBaseline(), isDebug);
                                                                            }, 
                                                                function() { 
                                                                                BlueToothDevices.Debug("read - failed", isDebug);
                                                                           });
                                                
                                                                ble.startNotification(deviceId, '1bc50001-0200-0aa5-e311-24cb004a98c5', '1bc50002-0200-0aa5-e311-24cb004a98c5', 
                                                                function(buffer2) { 
                                                                                    var data2 = new Int32Array(buffer2);
                                                                                    var result2 = BlueToothDevices.ToHexadecimal(data2);
                                                                                    BlueToothDevices.Debug("StartNotification baseline: " + BlueToothDevices.ReadBaseline() + ", result: " + result2, isDebug);
                                                                                    BlueToothDevices.ProcessResult(result2, BlueToothDevices.ReadBaseline(), isDebug);
                                                                            }, 
                                                                function() { 
                                                                                BlueToothDevices.Debug("StartNotification - failed", isDebug);
                                                                           });
                                                         }
                
                                               }, 
                        
                                    function() { BlueToothDevices.Debug("Connect> failed", isDebug);});
        }
        catch (e)
        {
            var errorMessage  = BlueToothDevices.ToString(e);
            BlueToothDevices.Debug("Connect> " + errorMessage, isDebug);
        }
    },
    ConnectDevices: function (devices, baseline, isDebug, callback)
    {
        if(devices !== undefined && devices.length > 0)
        {
            for (var i=0; i <devices.length; i++) {
                 var deviceId = devices[i].id;
                 var deviceName = devices[i].name;
                 if( (deviceId !== undefined) & (deviceName !== undefined && deviceName.indexOf("Bake Scale PRO") > -1) ){
                      BlueToothDevices.Connect(deviceId, baseline, isDebug, callback);                        
                  }
            }
        }
    },
    Read: function(deviceId, service_uuid, characteristic_uuid, baseline, isDebug, callback)
    {
        try{
               BlueToothDevices.Debug("Reading ble device", isDebug);  
                
               ble.read(deviceId, service_uuid, characteristic_uuid, 
                                   function(buffer) { 
                                                                            var data = new Int32Array(buffer);
                                                                            var result = BlueToothDevices.ToHexadecimal(data);
                                       
                                                                           BlueToothDevices.Debug("read with callback: " + BlueToothDevices.ReadBaseline() + ", result: " + result, isDebug);                                       
                                                                            callback({function_name:'ble.read', result:result, baseline:BlueToothDevices.ReadBaseline(), isDebug:isDebug});
                                                                }, 
                                    function() { 
                                                                        BlueToothDevices.Debug("read - failed", isDebug);
                                                                   });
                                        
              ble.startNotification(deviceId, service_uuid, characteristic_uuid, 
                                    function(buffer2) { 
                                                                            var data2 = new Int32Array(buffer2);
                                                                            var result2 = BlueToothDevices.ToHexadecimal(data2);
                                                                            BlueToothDevices.Debug("startNotification with callback baseline: " + BlueToothDevices.ReadBaseline() + ", result: " + result2, isDebug);
                                                                            callback({name:'ble.startNotification', result:result2, baseline:BlueToothDevices.ReadBaseline(), isDebug:isDebug});
                                                                    }, 
                                     function() { 
                                                                        BlueToothDevices.Debug("startNotification - failed", isDebug);
                                                                   });
                
        }
        catch (e)
        {
            var errorMessage  = BlueToothDevices.ToString(e);
            BlueToothDevices.Debug('Read>' + errorMessage, isDebug);
        }
    },
    StopScan: function (isDebug, callback)
    {
         var devices = BlueToothDevices.ListDevices();
                
         if(devices !== undefined && devices.length > 0)
         {
             for (var i=0; i <devices.length; i++) {
                 var deviceId = devices[i].id;
                 if(deviceId !== undefined){
                      BlueToothDevices.Disconnect(deviceId, isDebug, callback);                        
                  }
            }
         }
        
        ble.stopScan(
            function() { 
               BlueToothDevices.Debug("Stop Scan succeeded!", isDebug);
            },
            function() { 
                BlueToothDevices.Debug("Stop Scan failed!", isDebug);
            }
        );
    },
    Disconnect: function (deviceId, isDebug, callback)
    {
        try{
            ble.disconnect(deviceId, 
                                    function() { 
                                                    BlueToothDevices.Debug("Disconnect - successful", isDebug); 
                                                    if (typeof callback === "function") { callback( {device_id: deviceId, result: true} ); }
                                               }, 
                        
                                    function() { 
                                                   BlueToothDevices.Debug("Disconnect - failed", isDebug);
                                                   if (typeof callback === "function") { callback( {device_id: deviceId, result: false} ); }
                                                });
        }
        catch (e)
        {
            var errorMessage  = BlueToothDevices.ToString(e);
            BlueToothDevices.Debug('Disconnect> ' + errorMessage, isDebug);
        }
    },
    ToString: function (obj) {
        var str = '';
        
        if(obj != undefined && obj != null)
        {
            for (var p in obj) {
                if (obj.hasOwnProperty(p)) {
                    str += p + '::' + obj[p] + '\n';
                }
            }
        }
        
        return str;
    },
    ToHexadecimal: function(arrayInput)
    {
        var result = '0X';
        var length = arrayInput.length;
        for (var i = length-1; i >= 0; --i) {
            var output = arrayInput[i].toString(16);
            if(output.length === 1)
            {
                output = '0' + output;
            }
            result += output;
        }
        result = parseInt(result, 16);
        return result;
    },
    Debug: function(message, isDebug)
    {
        //alert(JSON.stringify({Message: message, IsDebug: isDebug}));
        if(isDebug === undefined || isDebug === null) 
        {
            isDebug = false;
        }
        
        if(isDebug)
        {
            console.log(message);
        }
        else
        {
           //console.log(message);
        }
    }
,onDeviceScan: function onDeviceScan(device, baseline, isDebug) {
                BlueToothDevices.Debug('BlueToothDevices.onDeviceScan > ' + JSON.stringify({baseline: baseline, debug: isDebug} ) , isDebug);
                
                BlueToothDevices.AddDevice(device, isDebug);
        
                var devices = BlueToothDevices.ListDevices();
                
                if(devices !== undefined && devices.length > 0)
                {
                    BlueToothDevices.Debug('Listing devices > ' + JSON.stringify(devices) , isDebug);
                    
                    BlueToothDevices.ConnectDevices(devices, baseline, isDebug,  BlueToothDevices.onConnectDevice);
                }                        
}
            
,onConnectDevice: function onConnectDevice(device, baseline, isDebug) {
               BlueToothDevices.Debug('BlueToothDevices.onConnectdevice', isDebug);
                BlueToothDevices.Read(device.device_id, device.service_uuid, device.characteristic_uuid, device.baseline, device.isDebug, BlueToothDevices.onReadDevice);
}           
,onReadDevice: function onReadDevice(device, baseline, isDebug) {
               BlueToothDevices.Debug('BlueToothDevices.onReadDevice > ' + JSON.stringify(device), isDebug);
                if (typeof this._ProcessResult === "function")
                {
                     BlueToothDevices.ProcessResult(device.result, device.baseline, isDebug, 100, this._ProcessResult); 
                }
                else
                {
                   BlueToothDevices.ProcessResult(device.result, device.baseline, isDebug, 100, BlueToothDevices.onReadWeights); 
                }                
}
            
,onReadWeights: function onReadWeights(weights, baseline, isDebug) {
               
                BlueToothDevices.Debug('onReadWeights > ' + JSON.stringify(weights), isDebug);
                var readWeightsDiv = document.getElementById('appTitle');
                var weight = weights[0];
                readWeightsDiv.innerHTML = weight.average_weight + ' | ' + weight.total_reads + ' | ' + weight.total_weight  + ' | ' + weight.baseline;

            }
};