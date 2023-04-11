// const srcPath:string = "C:/Users/Tanner/Documents/CS501R/QM/"

// import { TimedDependency, stageSummary, simulation, LRUCache, eventSummary, metronome, Event, Worker, ServiceQueue, WrappedStage, Timeout, Retry } from "C:/Users/Tanner/Documents/CS501R/QM/src";
// import {FIFOServiceQueue, ResponsePayload, Stage} from "C:/Users/Tanner/Documents/CS501R/QM/src";
// import { MathFunctions } from "C:/Users/Tanner/Documents/CS501R/QM/src";

const srcPath:string = "~/Desktop/cs-501/quartermaster-analysis/QM"

import { TimedDependency, stageSummary, simulation, LRUCache, eventSummary, metronome, Event, Worker, ServiceQueue, WrappedStage, Timeout, Retry } from "../quartermaster/src";
import {FIFOServiceQueue, ResponsePayload, Stage} from "../quartermaster/src";
import { MathFunctions } from "../quartermaster/src";

export class Request extends Event {
    assigned_services:number[] = []
    unassigned_services:number[] = []
    utility:number = Math.random()
    latency:number = Math.ceil(Math.random()*5) //uniform dist on interval 1,5
    latency_remaining:number = this.latency
    processing:boolean = false
}
class Service extends TimedDependency {

    name:string = ""
    service_utility = Math.random()


}

type Services = {
    list: Service[]
}
export function init_services(num_services:number,rand_utilities:boolean=true,list_utilities:number[],list_names:string[]){

    var service_list:Services = {list:[]}

    for (let i = 0; i < num_services; i++){

        const new_service = new Service
        new_service.mean = Math.floor(Math.random() * 1000)
        new_service.service_utility = Math.floor(Math.random() * 1000)
        service_list.list.push(new_service)


        //console.log(new_process.mean)
    }
    return service_list
}

// TODO split the code inside each "if (heuristic == "...")" into functions.
async function heuristic(num_workers:number,heuristic:string,requests:Request[],services:Services) {

    const num_processing:number = get_avail_workers(num_workers,requests)
    num_workers -= num_processing

    if (heuristic == "MaxOverallServices") {

        // const num_full_services = Math.floor(num_workers / requests.length)
        // const partial_service_tot = num_workers % requests.length
        var all_service_utilities = []
        var allocated_service_utilities = []
        var workers_remain:boolean = true
        var tot_serviced:number = 0


        for (let i = 0; i < services.list.length; i++) { //gather utility services
            all_service_utilities.push(services.list[i].service_utility)
        }

        while (workers_remain){
            var max = Math.max(...all_service_utilities)
            var service_index = all_service_utilities.indexOf(max)
            allocated_service_utilities.push(service_index)
            if (service_index !== -1) {
                all_service_utilities.splice(service_index, 1);
            }

            var serviceable_reqs:number[] = get_serviceable_reqs(requests,service_index)

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

        num_full_serviceable += leftover

        for (let i=0;i<num_full_serviceable;i++){
            requests[i].assigned_services.push(...requests[i].unassigned_services)

        }

        requests[num_full_serviceable+1].assigned_services.push(...requests[num_full_serviceable+1].unassigned_services.slice(0, partial_service_needed))

    }

}

function get_serviceable_reqs(reqs:Request[],service_index:number){

    var serviceable_list:number[] = []

    for (let i = 0; i < reqs.length; i++){
        if (reqs[i].unassigned_services.indexOf(service_index) !== -1){
            serviceable_list.push(i)
        }
    }
    return serviceable_list
}

function gen_reqs(num:number,num_services:number){

    var list:Request[] = []

    for (let i = 0; i < num;i++){
        var rand = Math.random()
        var req = new Request(rand.toString())
        req.unassigned_services = Array(num_services).fill(1).map( (_, i) => i+1 )

        list.push(req)
    }
    return list
}

// TODO notice that inside allocate and clean_services, there are repeated for loops for iterating over 
// requests and reqs[curr_req].assigned_services. These could instead extend from an abstract function,
// with different behavior inside.
async function allocate(reqs:Request[],services:Services){
    return new Promise<number>(resolve => {

        var tot_utility:number = 0

        for (let curr_req = 0; curr_req < reqs.length; curr_req++) {

            let curr_req_services: number[] = reqs[curr_req].assigned_services

            for (let curr_service = 0; curr_service < curr_req_services.length; curr_service++) {

                let service_obj: Service = services.list[curr_req_services[curr_service]-1]
                let req_obj: Request = reqs[curr_req]

                execute(req_obj, service_obj)

                req_obj.latency_remaining --

                if (req_obj.latency_remaining === 0){

                    req_obj.processing = false
                    req_obj.latency_remaining = req_obj.latency //reset remaining latency if future services need to be processed
                }

                tot_utility += service_obj.service_utility * req_obj.utility

                //req_obj.response.responsePayload = resp

            }
            }
        clean_services(reqs)
        resolve(tot_utility)
        })
    }


async function execute(req_obj:Request,service_obj:Service) {

    return await service_obj.accept(req_obj)
}


function clean_services(reqs:Request[]){

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

function get_avail_workers(num_workers:number,requests:Request[]){

    var num_still_working:number = 0
    for (let i=0;i<requests.length;i++){
        if (requests[i].processing){
            num_still_working ++
        }
    }
    return num_still_working
}

async function build(soak:number,peak:number,ttp:number,num_services:number,num_workers:number,heuristic_name="MaxOverallServices"){//,list_utilities,rand_utilities){
    const increase_per_tick = peak / ttp
    var curr_reqs_num:number = increase_per_tick
    var all_reqs:Request[] = []
    var ttl_utility:number = 0
    var ttl_updates:number = 0

    var services = init_services(num_services,false,[0.7,0.3,0.6,0.75,0.4,0.45,0.2,0.35,0.2,0.05],["img1","otherImgs","buyNow","atc","suggestions","reviews","details","boughtWith","header","footer"])


    // TODO make an abstract function for each of the following functions. 
    // The abstract function will have hook methods to account for differences. 
    for (let iter = 0;iter<ttp;iter++) { //ramp up
        ttl_updates ++
        let new_reqs:Request[] = gen_reqs(curr_reqs_num,num_services)
        all_reqs.push(...new_reqs)

        await heuristic(num_workers,heuristic_name,all_reqs,services)
        const add_utility:number = await allocate(all_reqs,services)

        ttl_utility += add_utility

        curr_reqs_num += increase_per_tick
    }

    for (let iter = 0;iter<soak;iter++) { //soak
        ttl_updates ++
        let new_reqs:Request[] = gen_reqs(curr_reqs_num,num_services)
        all_reqs.push(...new_reqs)
        await heuristic(num_workers,heuristic_name,all_reqs,services)
        const add_utility:number = await allocate(all_reqs,services)
        ttl_utility += add_utility

    }

    for (let iter = 0;iter<ttp;iter++) { //ramp down
        ttl_updates ++
        let new_reqs:Request[] = gen_reqs(curr_reqs_num,num_services)
        all_reqs.push(...new_reqs)
        await heuristic(num_workers,heuristic_name,all_reqs,services)
        const add_utility:number = await allocate(all_reqs,services)
        ttl_utility += add_utility

        curr_reqs_num -= increase_per_tick
    }

    console.log(ttl_updates)
    return ttl_utility

}

//build(30,100,15,10,50)
async function testing(iter:number){
    var utilities:number[] = []
    for (let i = 0;i<iter;i++) {
        await build(10,100,5,10,50).then((util)=> {

            utilities.push(util)
        })
    }
    console.log(utilities)
    return utilities
}
console.log(testing(10))