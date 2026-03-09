import { app } from '../data/data.js'
import { create, el, loadJSON } from './lib.js'


const layers = []


export async function initLayers(){

    await loadLayers();
    buildBaseLayers();

}

export async function buildBaseLayers(){
    
    app['global-layers'].forEach(async(obj)=>  {
        //const currentLayer = layers[obj.id]
        const currentLayer = await loadLayer(obj.id);
        console.log(currentLayer)
        if(currentLayer){
            buildLayer(currentLayer, el('#layers'))
        }
    })
}


function t(obj, string){
    return obj.translations[string][app.language] 
}

function getLayer(id){
    return app['layer-collection'][id]
}


async function loadLayers(){
    const data = await loadJSON('data/layers/base-map.json');    
        layers[data.id] =  data
    
}
async function loadLayer(id){
    const data = await loadJSON(`data/layers/${ id }.json`);    
    layers[data.id] =  data
    return data
    
}

function buildLayer(layer, parent){
    // Build Layer toggle
    if(!layer.subLayer){
       
        const toggleSwitch = create('div')
        toggleSwitch.classList.add('toggleSwitch')

        const toggleIcon = create('img')
        toggleIcon.src = layer.icon ? layer.icon : "images/layer-icons/location.svg"
        toggleSwitch.append(toggleIcon)

        const toggleBtn = create('label')
        toggleBtn.innerText = t(layer, 'name')
        toggleSwitch.append(toggleBtn)

         switch(layer.toggle){
            case "false":
                toggleSwitch.classList.add('deactivated')
                break;
            case "hidden":
                toggleSwitch.classList.add('hidden')
                break;
            case "true":
                toggleSwitch.addEventListener('click', function(){
                    handletoggle(toggleSwitch);
                })
                break;
            
        }
        el('#layer-control').append(toggleSwitch)
    }
    
    const wrapper = create("div")
    wrapper.className = ("layer")

    // Build Layer Object
    let layerElement;
    let content;
    switch(layer.type){
        case "color":
            layerElement = create("div")
            layerElement.style.backgroundColor = layer.background
            break;
        case "image":
            layerElement = create("img")
            layerElement.src = layer.file;
            break;
        case "layergroup":
            layerElement = create("div")
            content = layer.layers.forEach((subLayer)=>{
                buildLayer(subLayer, wrapper)
            })
            break;
        default:
            layerElement = create("div")
            layerElement.innerText = "Type-Mismatch"
            break;
    }
    
    if(layer.css){
        wrapper.setAttribute('style', layer.css)
    }
    layerElement.classList.add('layer-content')
    wrapper.classList.add(`layer-${ layer.type }`)
    wrapper.id = layer.id
    wrapper.append(layerElement)
    //console.log("currentLayer", layer)
    //layerElement.innerText = t(layer, 'name')
    parent.append(wrapper)

}


function handletoggle(toggleBtn){
    toggleBtn.classList.toggle("active")

}