var request = require('request');
var reload = require('require-reload')(require),
    configFile = reload(__dirname+'/../../../../../../configurations/configuration.js');
var tracing = require(__dirname+'/../../../../../../tools/traces/trace.js');
var vehicle_logs = require(__dirname+'/../../../../../vehicle_logs/vehicle_logs.js');

var update = function(req, res)
{

	if(typeof req.cookies.user != "undefined")
	{
		req.session.user = req.cookies.user;
	}	

	tracing.create('ENTER', 'PUT blockchain/assets/vehicles/vehicle/'+v5cID+'/make', []);
	configFile = reload(__dirname+'/../../../../../../configurations/configuration.js');
	
	var oldValue = req.body.oldValue;
	var newValue = req.body.value;
	var v5cID = req.params.v5cID;
	
	res.write('{"message":"Formatting request"}&&');
									
	var invokeSpec = 	{
						  "jsonrpc": "2.0",
						  "method": "invoke",
						  "params": {
						    "type": 1,
						    "chaincodeID": {
						      "name": configFile.config.vehicle_name
						    },
						    "ctorMsg": {
						      "function": "update_make",
						      "args": [
						        newValue.toString(), v5cID
						      ]
						    },
						    "secureContext": req.session.user
						  },
						  "id": 123
						}
									
	
	var options = 	{
						url: configFile.config.api_ip+':'+configFile.config.api_port_external+'/chaincode',
						method: "POST", 
						body: invokeSpec,
						json: true
					}
	
	res.write('{"message":"Updating make value"}&&');
	request(options, function(error, response, body)
	{
		if (!error && response.statusCode == 200)
		{
			var j = request.jar();
			var str = "user="+req.session.user
			var cookie = request.cookie(str);
			var url = configFile.config.app_url + '/blockchain/assets/vehicles/'+v5cID+'/make';
			j.setCookie(cookie, url);
			var options = {
				url: url,
				method: 'GET',
				jar: j
			}
			res.write('{"message":"Achieving Consensus"}&&');
			var counter = 0;
			var interval = setInterval(function(){
				if(counter < 5){
					request(options, function (error, response, body) {
						if (!error && response.statusCode == 200) {
							if(JSON.parse(body).vehicle.make == newValue)
							{
								var result = {};
								result.message = 'Make updated'
								vehicle_logs.create(["Update", "Make: " + oldValue + " →  " + req.body.value ,v5cID, req.session.user], req,res);
								res.end(JSON.stringify(result))
								clearInterval(interval);
							}
						}
					})
					counter++;
				}	
				else
				{
					res.status(400)
					tracing.create('ERROR', 'PUT blockchain/assets/vehicles/vehicle/'+v5cID+'/make', 'Unable to update make. v5cID: '+ v5cID)
					var error = {}
					error.error = true
					error.message = 'Unable to confirm make update. Request timed out.'
					error.v5cID = v5cID;
					res.end(JSON.stringify(error))
					clearInterval(interval);
				}
			}, 1500)
		}
		else 
		{
			res.status(400)
			tracing.create('ERROR', 'PUT blockchain/assets/vehicles/vehicle/'+v5cID+'/make', 'Unable to update make. v5cID: '+ v5cID)
			var error = {}
			error.error = true
			error.message = 'Unable to update make.'
			error.v5cID = v5cID;
			res.end(JSON.stringify(error))
		}
	})
}
exports.update = update;
