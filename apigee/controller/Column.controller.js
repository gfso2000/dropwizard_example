sap.ui.define([
        'jquery.sap.global',
        'sap/ui/core/mvc/Controller',
        'sap/ui/model/json/JSONModel',
        'sap/viz/ui5/data/FlattenedDataset',
        '../CustomerFormat',
        '../InitPage'
    ], function(jQuery, Controller, JSONModel, FlattenedDataset, CustomerFormat, InitPageUtil) {
    "use strict";
    
    var Controller = Controller.extend("sap.sf.apigee.controller.Column", {
        
        settingsModel : {
        	dateValueDRSVisible:false,
            dateValueDRS:new Date(),
            secondDateValueDRS:new Date(),
            dateRangeType: {
            	label:"TimeFrame",
            	typeList: [{TypeId:'_5minutes',TypeName:"Last 5 Minutes"},
            	           {TypeId:'_10minutes',TypeName:"Last 10 Minutes"},
            	           {TypeId:'_1hour',TypeName:"Last 1 Hour"},
            	           {TypeId:'_24hours',TypeName:"Last 24 Hours"},
            	           {TypeId:'_7days',TypeName:"Last 7 Days"},
            	           {TypeId:'_dateRange',TypeName:"Date Range"}]
            },
            dcType: {
            	label:"DC",
            	typeList: [{TypeId:'ALL',TypeName:"ALL"}]
            },
            dimensionLabel: "Time",
            metricMap: {
//            	sumOfTraffic_DC1: 'Sum of Traffic DC1',
//            	sumOfTraffic_DC2: 'Sum of Traffic DC2',
//            	sumOfTraffic_DC3: 'Sum of Traffic DC3',
//            	sumOfTraffic_DC4: 'Sum of Traffic DC4',
//            	sumOfTraffic_DC5: 'Sum of Traffic DC5',
//            	sumOfTraffic_DC6: 'Sum of Traffic DC6',
            }
        },
        
        oVizFrame : null,
 
        onInit : function (evt) {
        	this.settingsModel.dateValueDRS.setDate(this.settingsModel.secondDateValueDRS.getDate() - 1);
        	//get dc list
        	var sourceURL = "/apigeeservice/dclist";
			var dataModel = new JSONModel();
			try {
				dataModel.loadData(sourceURL, null, false);
			} catch (e) {
				sap.ui.core.BusyIndicator.hide();
				self.showErrorMessage(sourceURL);
			}
			var dcList = dataModel.oData.content.split(';');
			for(var i = 0;i<dcList.length;i++) {
				if(dcList[i]!='') {
					this.settingsModel.metricMap['sumOfTraffic_'+dcList[i]] = 'Sum of Traffic '+dcList[i];
				}
			}
        	//build metric select list
        	for(var name in this.settingsModel.metricMap) {
        		var measureItem = {};
        		measureItem['TypeId'] = name;
        		measureItem['TypeName'] = this.settingsModel.metricMap[name];
        		this.settingsModel.dcType.typeList.push(measureItem);
        	}
        },
        onAfterRendering : function(){
        	//sap.ui.core.BusyIndicator.show(0);
        	var self = this;
        	setTimeout(function(){
        		self.initCustomFormat();
                // set explored app's demo model on this sample
                var oModel = new JSONModel(self.settingsModel);
                oModel.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay);
                self.getView().setModel(oModel);
                
                var oVizFrame = self.oVizFrame = self.getView().byId("idVizFrame");
                oVizFrame.setVizProperties({
                    plotArea: {
                        dataLabel: {
                            formatString: CustomerFormat.FIORI_LABEL_FORMAT_8,
                            visible: true
                        }
                    },
                    valueAxis: {
                        label: {
                            formatString: CustomerFormat.FIORI_LABEL_FORMAT_8
                        },
                        title: {
                            visible: true
                        }
                    },
                    categoryAxis: {
                        title: {
                            visible: true
                        }
                    },
                    legend: {
                    	visible: true
                    },
                    title: {
                    	visible: false
                    }
                });
                
            	var chartModel = new JSONModel();
                var chartData={};
                chartData['dimensionLabel']=self.settingsModel.dimensionLabel;
                chartData['metricMap']=self.settingsModel.metricMap;
                chartModel.setData(chartData);
                //important, otherwise, after applyMetric, it will change settingsModel.metricMap by vizFrame
                chartModel.setDefaultBindingMode(sap.ui.model.BindingMode.OneWay);
                self.oVizFrame.setModel(chartModel);

                self.fillData();
                InitPageUtil.initPageSettings(self.getView());
                
                var oPopOver = self.getView().byId("idPopOver");
                oPopOver.connect(oVizFrame.getVizUid());
                oPopOver.setFormatString(CustomerFormat.FIORI_LABEL_FORMAT_8);
                
                var dateRange = self.getView().byId('DRS');
                dateRange.setWidth("16rem");
                
                sap.ui.core.BusyIndicator.hide();        		
        	},1);
        },
        getMeasures: function() {
        	var measures = [];
        	for(var name in this.settingsModel.metricMap) {
        		var measureItem = {};
        		measureItem['name'] = this.settingsModel.metricMap[name];//name;//this.settingsModel.metricMap[name];
        		measureItem['value'] = '{'+name+'}';
        		measures.push(measureItem);
        	}
        	return measures;
        },
        applyDataSet: function(){
        	var self = this;
        	var dataset = {
                data: {
                	path: "/result"
                },
                dimensions: [{
                    name: self.settingsModel.dimensionLabel,
                    value: "{timeUnit}"
                }],
                measures: self.getMeasures()
            };
            var oDataset = new FlattenedDataset(dataset);
            self.oVizFrame.setDataset(oDataset);
        },
        applyMetric: function(){
        	var selectedMetric = this.getView().byId("showDCName").getSelectedKey();
        	var feedValues = [];
        	if(selectedMetric=='ALL') {
            	for(var name in this.settingsModel.metricMap) {
            		feedValues.push(this.settingsModel.metricMap[name]);
            	}
        	} else {
            	feedValues.push(this.settingsModel.metricMap[selectedMetric]);
        	}
            if(this.oVizFrame){
                var feedValueAxis = this.getView().byId('valueAxisFeed');
                this.oVizFrame.removeFeed(feedValueAxis);
                feedValueAxis.setValues(feedValues);
                this.oVizFrame.addFeed(feedValueAxis);
            }
        },

        fillData: function(){
        	var self = this;
        	
        	self.applyDataSet();
        	self.applyMetric();
        	
        	//construct odata url
			var tzo = (new Date().getTimezoneOffset())*-1;
			var rangeType = self.getView().byId("rangeType").getSelectedKey();
			var endDate = new Date();
			var startDate;
			var timeUnit;
			if(rangeType == '_5minutes') {
				startDate = new Date(endDate.getTime() - 5 * 60000);
				timeUnit = "minute";
			} else if(rangeType == '_10minutes') {
				startDate = new Date(endDate.getTime() - 10 * 60000);
				timeUnit = "minute";
			} else if(rangeType == '_1hour') {
				startDate = new Date(endDate.getTime() - 60 * 60000);
				timeUnit = "minute";
			} else if(rangeType == '_24hours') {
				startDate = new Date(endDate.getTime() - 24 * 60 * 60000);
				timeUnit = "hour";
			} else if(rangeType == '_7days') {
				startDate = new Date(endDate.getTime() - 7* 24 * 60 * 60000);
				timeUnit = "day";
			} else {
				endDate = self.getView().getModel().oData.secondDateValueDRS;
				endDate = new Date( endDate.getFullYear(), endDate.getMonth(), endDate.getDate()+1, 0, 0, 0);
				startDate = self.getView().getModel().oData.dateValueDRS;
				startDate = new Date( startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
				timeUnit = "day";
			}
			//11/1/2016+00:00:00~11/8/2016+23:59:59
//			var startDateUTC = (startDate.getUTCMonth()+1)+"/"+startDate.getUTCDate()+"/"+startDate.getUTCFullYear()+"+"+startDate.getUTCHours()+":"+startDate.getUTCMinutes()+":"+startDate.getUTCSeconds();
//			var endDateUTC = (endDate.getUTCMonth()+1)+"/"+endDate.getUTCDate()+"/"+endDate.getUTCFullYear()+"+"+endDate.getUTCHours()+":"+endDate.getUTCMinutes()+":"+endDate.getUTCSeconds();
//			var sourceURL = location.protocol+"//"+location.host+"/odata/v2/restricted/getApiReport?datetimeRange='"+startDateUTC+"~"+endDateUTC+"'&timeUnit='"+timeUnit+"'&tzo="+tzo+"&$format=json";
			var startDate = (startDate.getMonth()+1)+"/"+startDate.getDate()+"/"+startDate.getFullYear()+"+"+startDate.getHours()+":"+startDate.getMinutes()+":"+startDate.getSeconds();
			var endDate = (endDate.getMonth()+1)+"/"+endDate.getDate()+"/"+endDate.getFullYear()+"+"+endDate.getHours()+":"+endDate.getMinutes()+":"+endDate.getSeconds();
//			var sourceURL = location.protocol+"//"+location.host+"/odata/v2/restricted/getApiReport?datetimeRange='"+startDate+"~"+endDate+"'&timeUnit='"+timeUnit+"'&tzo='"+tzo+"'&$format=json";
			
			var allDCResult={
				"result":[]
			};
			for(var name in this.settingsModel.metricMap) {
				var name = name.replace('sumOfTraffic_','');
				var sourceURL = '/apigeeservice/data?dc='+name+'&timerange='+startDate+'~'+endDate+'&timeunit='+timeUnit;
//				var dataModel = new JSONModel();
//	            try{
//	                dataModel.loadData(sourceURL, null, false);
//	            }catch(e){
//	            	continue;
//	            }
//	            var respText = dataModel.oData.content;
//	            if(respText == null || respText.toLowerCase().startsWith('error:')) {
//	            	continue;
//	            }
//	            var dcResult = JSON.parse(respText);
//	            for(var i = 0;i<dcResult.chart.ALL.length;i++) {
//	            	var oneUnitValue = dcResult.chart.ALL[i];
//	            	var timeUnitValue = oneUnitValue['timeUnit'];
//	            	var date = new Date(timeUnitValue);
//	            	var formattedTimeUnit = date.getFullYear()+"-"+(date.getMonth()+1)+"-"+date.getDate()+" "+date.getHours()+":"+date.getMinutes()+":"+date.getSeconds();
//	            	var targetUnitValue = this.locateTimeUnit(allDCResult, formattedTimeUnit);
//	            	targetUnitValue["sumOfTraffic_"+name] = oneUnitValue['sumOfTraffic'];
//	            }
	            var aData = jQuery.ajax({
	                type : "GET",
	                url : sourceURL,
	                success : function(data, textStatus, jqXHR) {
	                	var respText = data.content;
	                	var finalName = data.tag;
	                	if(respText == null || respText.toLowerCase().startsWith('error:')) {
	                		return;
	                	}
	                	var dcResult = JSON.parse(respText);
	    	            for(var i = 0;i<dcResult.chart.ALL.length;i++) {
	    	            	var oneUnitValue = dcResult.chart.ALL[i];
	    	            	var timeUnitValue = oneUnitValue['timeUnit'];
	    	            	var date = new Date(timeUnitValue);
	    	            	var formattedTimeUnit = date.getFullYear()+"-"+(date.getMonth()+1)+"-"+date.getDate()+" "+date.getHours()+":"+date.getMinutes()+":"+date.getSeconds();
	    	            	var targetUnitValue = self.locateTimeUnit(allDCResult, formattedTimeUnit);
	    	            	targetUnitValue["sumOfTraffic_"+finalName] = oneUnitValue['sumOfTraffic'];
	    	            }
	    	        	var resultModel = new JSONModel();
	    	        	resultModel.setData(allDCResult);
	    	        	
	    	        	var chartModel = new JSONModel();
	    	            var chartData=resultModel.getData();
	    	            chartData['dimensionLabel']=self.settingsModel.dimensionLabel;
	    	            chartData['metricMap']=self.settingsModel.metricMap;
	    	            chartModel.setData(chartData);
	    	            //important, otherwise, after applyMetric, it will change settingsModel.metricMap by vizFrame
	    	            chartModel.setDefaultBindingMode(sap.ui.model.BindingMode.OneWay);
	    	            self.oVizFrame.setModel(chartModel);
	    	        	//self.oVizFrame.setModel(resultModel);
	    	            //apply again, otherwise if from 'no_data' to 'has_data', the metric doesn't work
	    	        	self.applyDataSet();
	    	        	self.applyMetric();
	                }
	            });
			}
//        	var resultModel = new JSONModel();
//        	resultModel.setData(allDCResult);
//        	
//        	var chartModel = new JSONModel();
//            var chartData=resultModel.getData();
//            chartData['dimensionLabel']=self.settingsModel.dimensionLabel;
//            chartData['metricMap']=self.settingsModel.metricMap;
//            chartModel.setData(chartData);
//            //important, otherwise, after applyMetric, it will change settingsModel.metricMap by vizFrame
//            chartModel.setDefaultBindingMode(sap.ui.model.BindingMode.OneWay);
//            self.oVizFrame.setModel(chartModel);
//        	//self.oVizFrame.setModel(resultModel);
//            //apply again, otherwise if from 'no_data' to 'has_data', the metric doesn't work
//        	self.applyDataSet();
//        	self.applyMetric();
//            sap.ui.core.BusyIndicator.hide();
        },
        locateTimeUnit: function(allDCResult, searchedTimeUnit){
			for(var i=0;i<allDCResult['result'].length;i++) {
				var oneUnitValue = allDCResult['result'][i];
				var timeUnit = oneUnitValue['timeUnit'];
				if(timeUnit == searchedTimeUnit) {
					return oneUnitValue;
				}
			}
			var newTimeUnitValue = {
					"timeUnit":searchedTimeUnit
			}
			allDCResult['result'].push(newTimeUnitValue);
			return newTimeUnitValue;
        },
        showErrorMessage: function(msg){
        	var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
			MessageBox.error(msg, {styleClass: bCompact? "sapUiSizeCompact" : ""});
        },
        onDateRangeChange : function(oEvent){
        	var model = this.getView().getModel();
        	var dateRange = oEvent.getSource();
        	var key = dateRange.getSelectedKey();
        	if(key == '_dateRange') {
        		model.oData.dateValueDRSVisible = true;
        	} else {
        		model.oData.dateValueDRSVisible = false;
        	}
        	model.refresh();
        	
        	//sap.ui.core.BusyIndicator.show(0);
        	var self = this;
        	setTimeout(function(){
            	self.fillData();
        	},1);
        },
        onDRSChanged : function(oEvent){
        	var sFrom = oEvent.getParameter("from");
			var sTo = oEvent.getParameter("to");
			var bValid = oEvent.getParameter("valid");
			var oDRS = oEvent.oSource;
			if (bValid) {
				oDRS.setValueState(sap.ui.core.ValueState.None);
			} else {
				oDRS.setValueState(sap.ui.core.ValueState.Error);
			}
			//var startDate = this.getView().getModel().oData.dateValueDRS;
			//var endDate = this.getView().getModel().oData.secondDateValueDRS;
			//alert(startDate+"\r\n"+endDate);
        	//sap.ui.core.BusyIndicator.show(0);
        	var self = this;
        	setTimeout(function(){
            	self.fillData();
        	},1);
        },
        onDCNameChange : function(oEvent){
        	this.applyDataSet();
        	this.applyMetric();
        },
        initCustomFormat : function(){
            CustomerFormat.registerCustomFormat();
        }
    }); 
 
    return Controller;
 
});