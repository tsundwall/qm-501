
import { TimedDependency, Event } from "../src";

export class Request extends Event {
    assigned_services:number[] = []
    unassigned_services:number[] = []
    utility:number = Math.random()
    latency:number = Math.ceil(Math.random()*5) //uniform dist on interval 1,5
    latency_remaining:number = this.latency
    processing:boolean = false
    processing_count:number = 0
}
export class Service extends TimedDependency {

    name:string = ""
    service_utility = Math.random()
    latency:number = Math.ceil(Math.random()*5)


}

export type Services = {
    list: Service[]
}
export function init_services(num_services:number,rand_utilities:boolean=true,list_utilities:number[],list_names:string[]){

    var service_list:Services = {list:[]}

    for (let i = 0; i < num_services; i++){

        const new_service = new Service
        new_service.mean = Math.floor(Math.random() * 1000)
        if (!rand_utilities){

            //new_service.service_utility = Math.round(Math.random())+1.003
            new_service.service_utility = list_utilities[i]
        } else{
            new_service.service_utility = Math.floor(Math.random() * 10)
        }
        service_list.list.push(new_service)


    }
    return service_list
}

export async function heuristic(num_workers:number,heuristic:string,requests:Request[],services:Services) {

    const num_processing:number = get_avail_workers(num_workers,requests)
    num_workers -= num_processing

    if (heuristic == "MaxOverallServices") {

        var all_service_utilities:number[] = []
        var allocated_service_utilities = []
        var workers_remain:boolean = true
        var tot_serviced:number = 0
        var service_index:number = 0

        for (let i = 0; i < services.list.length; i++) { //gather service utilities
            all_service_utilities.push(services.list[i].service_utility)
        }

        var remaining_service_utilities:number[] = all_service_utilities.filter(() => true)

        while (workers_remain){

            var max = Math.max(...remaining_service_utilities)
            service_index = all_service_utilities.indexOf(max)
            allocated_service_utilities.push(service_index)
            if (service_index !== -1) {
                remaining_service_utilities.splice(service_index, 1);
            }

            var serviceable_reqs:number[] = get_serviceable_reqs(requests,service_index,true)

            if (tot_serviced + serviceable_reqs.length > num_workers) { //if all reqs cant be serviced for current service, get first n
                let remaining_workers:number = num_workers - tot_serviced

                for (let i = 0; i < remaining_workers; i++) {
                    requests[serviceable_reqs[i]].assigned_services.push(service_index)
                }

                workers_remain = false

            } else{
                for (let i = 0; i < serviceable_reqs.length; i++) {
                    requests[serviceable_reqs[i]].assigned_services.push(service_index)
                }

            }

            tot_serviced += serviceable_reqs.length

        }




    } else if (heuristic == "Random") {

        let tot_serviced:number = 0

        while (tot_serviced < num_workers) {
            let curr_request_index = Math.floor(Math.random() * requests.length)
            let curr_service_index = Math.floor(Math.random() * services.list.length)

            if (requests[curr_request_index].unassigned_services.indexOf(curr_service_index) !== -1) {

                requests[curr_request_index].assigned_services.push(curr_service_index)
                tot_serviced += 1

            }
        }


    } else if (heuristic == "FIFO"){

        var num_full_serviceable:number = num_workers / services.list.length
        const partial_service_needed:number = num_workers % services.list.length

        const leftover:number = services.list.length - requests[0].unassigned_services.length

        num_full_serviceable += Math.floor(leftover/services.list.length)

        var num_allocated:number = 0
        var i:number = 0

        while (num_full_serviceable>num_allocated){
            i += 1
            if (requests[i].unassigned_services.length === services.list.length) {
                requests[i].assigned_services.push(...requests[i].unassigned_services)
                num_allocated += services.list.length
            }
        }

        requests[num_full_serviceable+1].assigned_services.push(...requests[num_full_serviceable+1].unassigned_services.slice(0, partial_service_needed))

    } else if (heuristic == "U/L"){

        var map:{[index: string]:number} = {}

        for (let r=0;r<requests.length;r++){
            for (let s=0;s<services.list.length;s++){
                //console.log(s)
                map[r+"-"+s] = (requests[r].utility * services.list[s].service_utility) / (requests[r].latency + services.list[s].latency)
            }
        }

        var sortableArray = Object.entries(map);
        var sortedArray = sortableArray.sort(([, a], [, b]) => a - b);
        var sortedObject = Object.fromEntries(sortedArray);

        var sortedObjectTrim = Object.entries(sortedObject).splice(Object.entries(sortedObject).length-num_workers,num_workers)

        for (const value of sortedObjectTrim){
            let unpack = value[0].split("-")
            let r:number = parseInt(unpack[0])
            let s:number = parseInt(unpack[1])
            //console.log(r)
            requests[r].assigned_services.push(s+1)

        }

    }

}

export function get_serviceable_reqs(reqs:Request[],service_index:number,index_of_one:boolean){

    var serviceable_list:number[] = []

    for (let i = 0; i < reqs.length; i++){
        if (reqs[i].unassigned_services.indexOf(service_index+1) !== -1){
            serviceable_list.push(i)
        }
    }
    return serviceable_list
}

export function gen_reqs(num:number,num_services:number){

    var list:Request[] = []

    for (let i = 0; i < num;i++){
        var rand = (Math.random()*2)+10
        var req = new Request(rand.toString())
        req.unassigned_services = Array(num_services).fill(1).map( (_, i) => i+1 )

        list.push(req)
    }
    return list
}
export async function allocate(reqs:Request[],services:Services,index_of_one:boolean){
    return new Promise<number[]>(resolve => {

        var _psuedo_work:number = 0
        var tot_utility:number = 0

        for (let curr_req = 0; curr_req < reqs.length; curr_req++) {

            let curr_req_services: number[] = reqs[curr_req].assigned_services
            let req_obj: Request = reqs[curr_req]

            if (curr_req_services.length > 0){ //if has assigned services, set to 'processing'
                req_obj.processing = true
                req_obj.processing_count = curr_req_services.length
                req_obj.latency_remaining = get_packaged_latency(req_obj,services,index_of_one)
            }

            if (req_obj.processing){ //if processing, decrement latency
                req_obj.latency_remaining --
                if (curr_req_services.length > 0){
                    req_obj.latency_remaining += req_obj.latency //if second set of services allocated, add to total lat
                }
            }

            if (req_obj.latency_remaining === 0){ //if complete, no longer processing

                req_obj.processing = false
                req_obj.latency_remaining = req_obj.latency //reset remaining latency if future services need to be processed
            }

            let start:number = 0

            if (index_of_one){
                start = 1
            }

            for (let curr_service = 0; curr_service < curr_req_services.length; curr_service++) {
                _psuedo_work ++
                let service_obj: Service = services.list[curr_req_services[curr_service]-1+start]

                execute(req_obj, service_obj)

                tot_utility += service_obj.service_utility * req_obj.utility

            }
            }

        clean_services(reqs)
        resolve([tot_utility,_psuedo_work])
        })
    }


export async function execute(req_obj:Request,service_obj:Service) {


    return await service_obj.accept(req_obj)
}

export function get_packaged_latency(req_obj:Request,services:Services,index_of_one:boolean){

    let max_latency:number = 0
    let curr_latency = max_latency

    let start:number = 0

    if (index_of_one){
        start = 1
    }


    for (let i=0;i<req_obj.assigned_services.length;i++){
        curr_latency = services.list[req_obj.assigned_services[i]-1+start].latency
        if (curr_latency > max_latency){
            max_latency = curr_latency
        }
    }

    return req_obj.latency + max_latency
}

export function clean_services(reqs:Request[]){

    for (let i = 0;i < reqs.length;i++){
        let remove_services:number[] = reqs[i].assigned_services

        for (let j = 0;j < remove_services.length;j++){
            let remove_index = reqs[i].assigned_services.indexOf(reqs[i].assigned_services[j])

            if (remove_index > -1) {
                reqs[i].unassigned_services.splice(remove_index, 1);
            }
        }
        reqs[i].assigned_services = []
        if (reqs[i].assigned_services.length === 0 && !(reqs[i].processing)){
            reqs.splice(i,1)
        }
    }
}

export function get_avail_workers(num_workers:number,requests:Request[]){

    var num_still_working:number = 0
    for (let i=0;i<requests.length;i++){
        if (requests[i].processing){
            num_still_working += requests[i].processing_count
        }
    }
    return num_still_working
}

export async function build(soak:number,peak:number,ttp:number,num_services:number,num_workers:number,services_list:number[],heuristic_name:string){//,list_utilities,rand_utilities){
    const increase_per_tick = peak / ttp
    var curr_reqs_num:number = increase_per_tick
    var all_reqs:Request[] = []
    var ttl_utility:number = 0
    var ttl_updates:number = 0
    var ttl_reqs:number = 0

    var services = init_services(num_services,false,services_list,["img1","otherImgs","buyNow","atc","suggestions","reviews","details","boughtWith","header","footer"])

    if (heuristic_name==="MaxOverallServices"){
        var index_of_one:boolean = true
    } else {
        var index_of_one:boolean = false
    }

    for (let iter = 0;iter<ttp;iter++) { //ramp up
        ttl_updates ++
        let new_reqs:Request[] = gen_reqs(curr_reqs_num,num_services)
        all_reqs.push(...new_reqs)

        await heuristic(num_workers,heuristic_name,all_reqs,services)
        let unpack = await allocate(all_reqs,services,index_of_one)

        const add_utility:number = unpack[0]
        const add_reqs_served:number = unpack[1]

        ttl_reqs += add_reqs_served
        ttl_utility += add_utility

        curr_reqs_num += increase_per_tick
    }

    for (let iter = 0;iter<soak;iter++) { //soak
        ttl_updates ++
        let new_reqs:Request[] = gen_reqs(curr_reqs_num,num_services)
        all_reqs.push(...new_reqs)
        await heuristic(num_workers,heuristic_name,all_reqs,services)
        let unpack = await allocate(all_reqs,services,index_of_one)

        const add_utility:number = unpack[0]
        const add_reqs_served:number = unpack[1]

        ttl_reqs += add_reqs_served
        ttl_utility += add_utility

    }

    for (let iter = 0;iter<ttp;iter++) { //ramp down
        ttl_updates ++
        let new_reqs:Request[] = gen_reqs(curr_reqs_num,num_services)
        all_reqs.push(...new_reqs)
        await heuristic(num_workers,heuristic_name,all_reqs,services)
        let unpack = await allocate(all_reqs,services,index_of_one)

        const add_utility:number = unpack[0]
        const add_reqs_served:number = unpack[1]

        ttl_reqs += add_reqs_served
        ttl_utility += add_utility

        curr_reqs_num -= increase_per_tick
    }


    return [ttl_utility,ttl_reqs]

}


export async function testing(iter:number,peak:number,ttp:number,num_workers:number,services_array:number[],heuristic_name:string,id:string){
    var utilities:number[] = []
    var counts:number[] = []

    for (let i = 0;i<iter;i++) {
        await build(20,peak,ttp,10,num_workers,services_array,heuristic_name).then(([util,count])=> {

            utilities.push(util)
            counts.push(count)
        })
    }
    console.log(id)
    console.log(heuristic_name + " Results: ")
    console.log(mean(utilities))
    console.log(mean(counts))
    console.log(mean(utilities)/mean(counts))
    return utilities
}

export function mean(arr:number[]){

    return arr.reduce((a,b) => a + b, 0) / arr.length
}

export const heuristics = ["Random","FIFO","MaxOverallServices","U/L"]


