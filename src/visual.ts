"use strict";

import "core-js/stable";
import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import VisualObjectInstanceEnumeration = powerbi.VisualObjectInstanceEnumeration;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ISelectionManager = powerbi.extensibility.ISelectionManager;

import * as d3 from "d3";

interface DataPoint{
    category: string;
    value: number;
    color: string;
    identity: powerbi.visuals.ISelectionId;
    highlighted: boolean;
    marginBottom: number;
}

interface ViewModel{
    dataPoints: DataPoint[];
    maxValue: number;
    highlights: boolean;
}

export class Visual implements IVisual {

    private host: IVisualHost;
    private svg: d3.Selection<SVGElement, any, any, any>;
    private barGroup: d3.Selection<SVGElement, any, any, any>;
    private xPadding: number = 0.1;
    private selectionManager: ISelectionManager;
    private xAxisGroup: d3.Selection<SVGElement, any, any, any>;
    private yAxisGroup: d3.Selection<SVGElement, any, any, any>;

    private settings = {
        axis : {
            x : {
                padding: {
                    default: 50,
                    value: 50
                },
                show: {
                    default: true,
                    value: true
                }
            },
            y : {
                padding: {
                    default: 50,
                    value: 50
                }
            }
        },
        border : {
            top: {
                default: 0,
                value: 0
            }
        }
    }

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.svg = d3.select(options.element)
            .append("svg")
            .classed("my-little-bar-chart", true);
        this.barGroup = this.svg.append("g")
            .classed("bar-group", true);

        this.xAxisGroup = this.svg.append("g")
            .classed("x-axis", true);
        
        this.yAxisGroup = this.svg.append("g")
            .classed("y-axis", true);

        this.selectionManager = this.host.createSelectionManager();
        }

    public update(options: VisualUpdateOptions) {
        this.updateSettings(options);
        let viewModel: ViewModel = this.getViewModel(options);
        viewModel = this.calculateMarginsOfColumns(viewModel);

        let width = options.viewport.width;
        let height = options.viewport.height;

        let xAxisPadding = this.settings.axis.x.show.value ? this.settings.axis.x.padding.value : 0;

        this.svg.attr('width', width)
        this.svg.attr('height', height)

        let yScale = d3.scaleLinear()
            .domain([0, viewModel.maxValue])
            .range([height - xAxisPadding, 0 + this.settings.border.top.value]);

        let xScale = d3.scaleBand()
            .domain(viewModel.dataPoints.map(d => d.category))
            .rangeRound([this.settings.axis.x.padding.value, width])
            .padding(this.xPadding)

        let xAxis = d3.axisBottom(xScale)
            .tickSize(1);
        
        let yAxis = d3.axisLeft(yScale)
            .tickSize(0.5);
        
        this.yAxisGroup
        .call(yAxis)
        .attr("transform", "translate(" + this.settings.axis.y.padding.value + ",0)")
        .style('fill', "#777777")
        .selectAll("text")
        .style("text-anchor", "end")
        .style("font-size", "x-small")

        this.xAxisGroup
            .call(xAxis)
            .attr("transform", "translate(0, " + (height - xAxisPadding) + ")")
            
            .style('fill', "#777777")
            .selectAll("text")
            .attr('transform', "rotate(-35)")
            .style("text-anchor", "end")
            .style("font-size", "x-small");

        let bars = this.barGroup
            .selectAll(".bar")
            .data(viewModel.dataPoints);

        bars.enter()
            .append("rect")
            .classed("bar", true);

        bars
            .attr("width", xScale.bandwidth())
            .attr("height", (d) => height - yScale(d.value) - xAxisPadding)
            .attr("y", d => {
              return yScale(d.value) - yScale(viewModel.maxValue - d.marginBottom)
            })
            .attr("x", d => xScale(d.category))

            .style("fill", d => d.color)
            .style("fill-opacity", d => viewModel.highlights ? d.highlighted ? 1.0 : 0.5 : 1.0)

        let xScaleLines = d3.scaleBand()
            .domain(viewModel.dataPoints.map(d => d.category))
            .rangeRound([this.settings.axis.x.padding.value, width])
            .padding(0.06)

        let barr = this.barGroup
            .selectAll(".barr")
            .data(viewModel.dataPoints.slice(0, viewModel.dataPoints.length - 2))
        barr
            .enter()
            .append("rect")
            .classed("barr", true);
        barr
            .attr("width", xScaleLines.bandwidth()*2)
            .attr("height", "1px")
            .attr("y", d => {
                return yScale(d.value) - yScale(viewModel.maxValue - d.marginBottom)
              })
            .attr("x", d => xScale(d.category))
            .style("fill", 'grey')

        bars.exit()
            .remove();
        barr.exit()
            .remove();
    }

    private calculateMaxValue (viewModel: ViewModel): number {
      const maxValue = viewModel.dataPoints.reduce(
        (accum, currentValue) => {
          return accum + currentValue.value
        }, 0);
      return maxValue;
    };

    private calculateMarginsOfColumns(viewModel: ViewModel): ViewModel {
        const transformedViewModel = viewModel.dataPoints.reduce(
          (accum, currentValue, index, array) => {
              let { value, marginBottom } = index !== 0
                  ? accum[accum.length-1]
                  : { value: 0, marginBottom: 0 };
              accum.push({
                  ...currentValue,
                  marginBottom: index !== array.length - 1 ? value + marginBottom : 0,
              })
              return accum
          }, [],
        );
        viewModel.dataPoints = transformedViewModel;
        return viewModel;
      };

    private updateSettings(option: VisualUpdateOptions) {
        let dv = option.dataViews;

        if( !dv
            || !dv[0]
            || !dv[0].metadata
            || !dv[0].metadata.objects
            || !dv[0].metadata.objects.xAxis)
            return null;
        
        let metadata = dv[0].metadata;
        let objects = metadata.objects;
        let xAxis = objects.xAxis;
        this.settings.axis.x.show.value = <boolean>xAxis.show;
    }

    private getViewModel(options: VisualUpdateOptions): ViewModel {
        let dv = options.dataViews;
        let viewModel: ViewModel = {
            dataPoints: [],
            maxValue: 0,
            highlights: false
        };

        if (!dv
            || !dv[0]
            || !dv[0].categorical.categories
            || !dv[0].categorical.categories[0].source
            || !dv[0].categorical.values
            || !dv[0].categorical.values)
            return viewModel;

        let view = dv[0].categorical;
        let categories = view.categories[0];
        let values = view.values[0];
        let highlights = values.highlights;

        const len = Math.max(categories.values.length, values.values.length)

        for (let i = 0; i < len; i++) {
            viewModel.dataPoints.push({
                category: <string>categories.values[i],
                value: <number>values.values[i],
                color: this.host.colorPalette.getColor(<string>categories.values[i]).value,
                identity: this.host.createSelectionIdBuilder()
                    .withCategory(categories, i)
                    .createSelectionId(),
                highlighted: highlights ? highlights[i] ? true : false : false,
                marginBottom: 0,
            });
        }
        viewModel.maxValue = this.calculateMaxValue(viewModel);
        const totalitem: DataPoint = {
            category: 'total',
            value: viewModel.maxValue,
            color: '#d3d3d3',
            identity: this.host.createSelectionIdBuilder()
                .withCategory(categories, len)
                .createSelectionId(),
            highlighted: highlights ? highlights[len] ? true : false : false,
            marginBottom: 0,
        }
        viewModel.dataPoints.push(totalitem);
        viewModel.highlights = viewModel.dataPoints.filter(d => d.highlighted).length > 0;
        return viewModel;
    }

    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
        let propertyGroupName = options.objectName;
        let properties: VisualObjectInstance[] = [];

        switch (propertyGroupName) {
            case "xAxis":
                properties.push({
                    objectName: propertyGroupName,
                    properties: {
                        show: this.settings.axis.x.show.value
                    },
                    selector: null
                });
                break;
        };
        return properties;
    }
}