import {heuristics,testing}from "./webpage"

for (const [pass,curr_heuristic] of Object.entries(heuristics)){
    var id = "low traffic/important elements"
    testing(100,20,1,10,[.95,.90,.8,.5,.2,.15,.1,.05,.001,0.0001],curr_heuristic,id)
}

for (const [pass,curr_heuristic] of Object.entries(heuristics)){
    var id = "high peak/important elements"
    testing(100,40,1,,10,[.95,.90,.8,.5,.2,.15,.1,.05,.001,0.0001],curr_heuristic,id)
}

for (const [pass,curr_heuristic] of Object.entries(heuristics)){
    var id = "low peak/important elements"
    testing(100,40,10,10,[.95,.90,.8,.5,.2,.15,.1,.05,.001,0.0001],curr_heuristic,id)
}


for (const [pass,curr_heuristic] of Object.entries(heuristics)){
    var id = "low traffic/uniform elements"
    testing(100,20,1,20,[.95,.90,.8,.5,.2,.15,.1,.05,.001,0.0001],curr_heuristic,id)
}

for (const [pass,curr_heuristic] of Object.entries(heuristics)){
    var id = "high peak/uniform elements"
    testing(100,40,1,20,[.95,.90,.8,.5,.2,.15,.1,.05,.001,0.0001],curr_heuristic,id)
}

for (const [pass,curr_heuristic] of Object.entries(heuristics)){
    var id = "low peak/uniform elements"
    testing(100,40,10,20,[.95,.90,.8,.5,.2,.15,.1,.05,.001,0.0001],curr_heuristic,id)
}