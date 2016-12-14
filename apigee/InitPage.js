sap.ui.define(
	[],
	function() {
		return {
			initPageSettings : function(b) {
				var self = this;
				if (jQuery.sap.sjax({
					type : "HEAD",
					url : sap.ui.resource("sap.suite.ui.commons", "library.js")
				}).success) {
					sap.ui.getCore().loadLibrary( "sap.suite.ui.commons");
					self.setChartVisible(b);
				}
			},
			setChartVisible : function(b) {
				//if want to show toolbar, then use below
//				var a = b.byId("idVizFrame"), a = new sap.suite.ui.commons.ChartContainerContent(
//						{
//							content : [ a ]
//						}), a = new sap.suite.ui.commons.ChartContainer(
//						{
//							content : [ a ]
//						});
//				a.setShowFullScreen(false);
//				a.setAutoAdjustHeight(!0);
//				a.setShowLegendButton(false);
//				a.setShowLegend(false);
//				a.setShowZoom(false);
//				b.byId("chartFixFlex").setFlexContent(a);
				
				//but I just show chart, no toolbar
				var a = b.byId("idVizFrame");
				b.byId("chartFixFlex").setFlexContent(a);
				a.setWidth("100%");
				//don't use 100%, in some zoom percentage, the chart will keep adjusting width and height
				a.setHeight("99%");
			}
		}
	}
);
