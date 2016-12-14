sap.ui.define(['sap/ui/core/UIComponent'],
    function(UIComponent) {
    "use strict";

    var Component = UIComponent.extend("sap.sf.apigee.Component", {

        metadata : {
            rootView : "sap.sf.apigee.view.Column",
            includes : ["../../css/exploredStyle.css"],
            dependencies : {
                libs : [
                    "sap.viz",
                    "sap.m"
                ]
            },
            config : {
                sample : {
                    stretch : true,
                    files : [
                        "view/Column.view.xml",
                        "controller/Column.controller.js",
                        "CustomerFormat.js",
                        "InitPage.js"
                    ]
                }
            }
        }
    });

    return Component;

});
