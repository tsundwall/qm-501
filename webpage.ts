
const srcPath:string = "C:/Users/Tanner/Documents/CS501R/QM/"

import { TimedDependency, stageSummary, simulation, LRUCache, eventSummary, metronome, Event, Worker, ServiceQueue, WrappedStage, Timeout, Retry } from "C:/Users/Tanner/Documents/CS501R/QM/src";
import {FIFOServiceQueue, ResponsePayload, Stage} from "C:/Users/Tanner/Documents/CS501R/QM/src";
import { MathFunctions } from "C:/Users/Tanner/Documents/CS501R/QM/src";

export class Request extends Event {
    assigned_services:number[] = []
    unassigned_services:number[] = []
    utility:number = Math.random()
}
class Service extends TimedDependency {

    name:string = ""
    service_utility = Math.random()


}

type Services = {
    list: Service[]
}
//
class LoadBalancer extends Stage {

    constructor(protected wrapped: Stage[]) {
        super();
    }
    inQueue = new FIFOServiceQueue(1, 1)

    async workOn(event: Request): Promise<ResponsePayload> {

        for (let i = 0; i < event.assigned_services.length; i++) {

            const service_id:number = event.assigned_services[i]

            this.wrapped[service_id].accept(event);
            console.log(i)
        }
    }
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

const new_process = new TimedDependency


async function work() {
    const events = await simulation.run(new_process, 160000);
    console.log("done");
    stageSummary([new_process])
    eventSummary(events);
    //stats.summary();
}

async function heuristic(num_workers:number,heuristic:string,requests:Request[],services:Services) {
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

        for (let i = 0; i < num_workers; i++) {
            let curr_request_index = Math.floor(Math.random() * requests.length)
            requests[curr_request_index].assigned_services.push(Math.floor(Math.random() * services.list.length))

        }

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
async function allocate(reqs:Request[],services:Services){
    return new Promise<number>(resolve => {

        var tot_utility:number = 0

        for (let curr_req = 0; curr_req < reqs.length; curr_req++) {

            let curr_req_services: number[] = reqs[curr_req].assigned_services

            for (let curr_service = 0; curr_service < curr_req_services.length; curr_service++) {

                let service_obj: Service = services.list[curr_req_services[curr_service]]
                let req_obj: Request = reqs[curr_req]
                let resp = execute(req_obj, service_obj)
                //console.log(resp)
                tot_utility += req_obj.utility * service_obj.service_utility
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
async function simulate(reqs:Request[], services:Services)
{
    const tot_utility:number = await allocate(reqs, services)
    console.log(tot_utility)
    //setTimeout(() => {  console.log(services.list[reqs[100].assigned_services[0]].time); }, 300);
}


function clean_services(reqs:Request[]){

    for (let i = 0;i < reqs.length;i++){
        let remove_services:number[] = reqs[i].assigned_services

        for (let j = 0;j < remove_services.length;j++){
            let remove_index = reqs[i].assigned_services.indexOf(reqs[i].assigned_services[j])

            if (remove_index > -1) {
                reqs[i].assigned_services.splice(remove_index, 1);
            }
        }
        reqs[i].assigned_services = []
    }
}

async function build(soak:number,peak:number,ttp:number,num_services:number,num_workers:number,heuristic_name="MaxOverallServices"){//,list_utilities,rand_utilities){
    const increase_per_tick = peak / ttp
    var curr_reqs_num:number = increase_per_tick
    var all_reqs:Request[] = []
    var ttl_utility:number = 0
    var ttl_updates:number = 0

    var services = init_services(num_services,false,[0.7,0.3,0.6,0.75,0.4,0.45,0.2,0.35,0.2,0.05],["img1","otherImgs","buyNow","atc","suggestions","reviews","details","boughtWith","header","footer"])


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
    console.log(ttl_utility)
    console.log(ttl_updates)
    return ttl_utility

}

build(20,100,5,10,50)