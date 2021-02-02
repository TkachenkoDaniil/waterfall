import { Visual } from "../../src/visual";
import powerbiVisualsApi from "powerbi-visuals-api"
import IVisualPlugin = powerbiVisualsApi.visuals.plugins.IVisualPlugin
import VisualConstructorOptions = powerbiVisualsApi.extensibility.visual.VisualConstructorOptions
var powerbiKey: any = "powerbi";
var powerbi: any = window[powerbiKey];

var mylittlebar3C01E3B911FC4867B6E1639143C2F933_DEBUG: IVisualPlugin = {
    name: 'mylittlebar3C01E3B911FC4867B6E1639143C2F933_DEBUG',
    displayName: 'mylittlebar',
    class: 'Visual',
    apiVersion: '2.6.0',
    create: (options: VisualConstructorOptions) => {
        if (Visual) {
            return new Visual(options);
        }

        throw 'Visual instance not found';
    },
    custom: true
};

if (typeof powerbi !== "undefined") {
    powerbi.visuals = powerbi.visuals || {};
    powerbi.visuals.plugins = powerbi.visuals.plugins || {};
    powerbi.visuals.plugins["mylittlebar3C01E3B911FC4867B6E1639143C2F933_DEBUG"] = mylittlebar3C01E3B911FC4867B6E1639143C2F933_DEBUG;
}

export default mylittlebar3C01E3B911FC4867B6E1639143C2F933_DEBUG;