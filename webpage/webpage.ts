// const srcPath:string = "C:/Users/Tanner/Documents/CS501R/QM/"

// import { TimedDependency, stageSummary, simulation, LRUCache, eventSummary, metronome, Event, Worker, ServiceQueue, WrappedStage, Timeout, Retry } from "C:/Users/Tanner/Documents/CS501R/QM/src";
// import {FIFOServiceQueue, ResponsePayload, Stage} from "C:/Users/Tanner/Documents/CS501R/QM/src";
// import { MathFunctions } from "C:/Users/Tanner/Documents/CS501R/QM/src";

const srcPath:string = "~/Desktop/cs-501/quartermaster-analysis/QM"

import { TimedDependency, stageSummary, simulation, LRUCache, eventSummary, metronome, Event, Worker, ServiceQueue, WrappedStage, Timeout, Retry } from "../../quartermaster/src";
import { FIFOServiceQueue, ResponsePayload, Stage } from "../../quartermaster/src";
import { MathFunctions } from "../../quartermaster/src";
import { Request, Service } from "../resources";
import { WebpageBase, Services } from "./webpage-base";



export class Webpage extends WebpageBase {

    constructor() {
        super();
    }

    init_services(num_services:number,rand_utilities:boolean=true,list_utilities:number[],list_names:string[]){

        var service_list:Services = {list:[]}

        for (let i = 0; i < num_services; i++){

            const new_service = new Service
            new_service.mean = Math.floor(Math.random() * 1000)
            if (!rand_utilities){
                //console.log(list_utilities[i])
                new_service.service_utility = Math.round(Math.random())+1.003
                //console.log(new_service.service_utility)
                //new_service.service_utility = list_utilities[i]
            } else{
                new_service.service_utility = Math.floor(Math.random() * 10)
            }
            service_list.list.push(new_service)


        }
        return service_list
    }

    async heuristic(num_workers:number,heuristic:string,requests:Request[],services:Services) {

        const num_processing:number = this.get_avail_workers(num_workers,requests)
        num_workers -= num_processing

        if (heuristic == "MaxOverallServices") {
            this.max_overall_services(num_workers,requests,services)
        } else if (heuristic == "Random") {
            this.random(num_workers,requests,services)
        } else if (heuristic == "FIFO"){
            this.fifo(num_workers,requests,services)
        } else if (heuristic == "U/L"){
            this.u_l(num_workers,requests,services)
        }
    }

    max_overall_services(num_workers:number,requests:Request[],services:Services) {
        var all_service_utilities:number[] = []
        var allocated_service_utilities:number[] = []
        var workers_remain:boolean = true
        var tot_serviced:number = 0


        for (let i = 0; i < services.list.length; i++) { //gather service utilities
            all_service_utilities.push(services.list[i].service_utility)
        }

        while (workers_remain){
            var max = Math.max(...all_service_utilities)
            var service_index = all_service_utilities.indexOf(max)
            allocated_service_utilities.push(service_index)
            if (service_index !== -1) {
                all_service_utilities.splice(service_index, 1);
            }

            var serviceable_reqs:number[] = this.get_serviceable_reqs(requests,service_index)

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
    }

    random(num_workers:number,requests:Request[],services:Services) {
        let tot_serviced:number = 0

        while (tot_serviced < num_workers) {
            let curr_request_index = Math.floor(Math.random() * requests.length)
            let curr_service_index = Math.floor(Math.random() * services.list.length)

            if (requests[curr_request_index].unassigned_services.indexOf(curr_service_index) !== -1) {

                requests[curr_request_index].assigned_services.push(curr_service_index)
                tot_serviced += 1

            }
        }
    }

    fifo(num_workers:number,requests:Request[],services:Services) {
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
    }

    u_l(num_workers:number,requests:Request[],services:Services) {
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


    get_serviceable_reqs(reqs:Request[],service_index:number){

        var serviceable_list:number[] = []

        for (let i = 0; i < reqs.length; i++){
            if (reqs[i].unassigned_services.indexOf(service_index) !== -1){
                serviceable_list.push(i)
            }
        }
        return serviceable_list
    }

    // TODO notice that inside allocate and clean_services, there are repeated for loops for iterating over 
    // requests and reqs[curr_req].assigned_services. These could instead extend from an abstract function,
    // with different behavior inside.
    async allocate(reqs:Request[],services:Services){
        return new Promise<number>(resolve => {

            var _psuedo_work:number = 0
            var tot_utility:number = 0

            for (let curr_req = 0; curr_req < reqs.length; curr_req++) {

                let curr_req_services: number[] = reqs[curr_req].assigned_services
                let req_obj: Request = reqs[curr_req]

                if (curr_req_services.length > 0){ //if has assigned services, set to 'processing'
                    req_obj.processing = true
                    req_obj.processing_count = curr_req_services.length
                    req_obj.latency_remaining = this.get_packaged_latency(req_obj,services)
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

                for (let curr_service = 0; curr_service < curr_req_services.length; curr_service++) {
                    _psuedo_work ++
                    let service_obj: Service = services.list[curr_req_services[curr_service]-1]

                    this.execute(req_obj, service_obj)
                    //console.log(service_obj.service_utility + req_obj.utility)
                    tot_utility += service_obj.service_utility * req_obj.utility

                }
                }

            this.clean_services(reqs)
            resolve(tot_utility)
            })
        }


    async execute(req_obj:Request,service_obj:Service) {


        return await service_obj.accept(req_obj)
    }

    get_packaged_latency(req_obj:Request,services:Services){

        let max_latency:number = 0
        let curr_latency = max_latency

        for (let i=0;i<req_obj.assigned_services.length;i++){
            curr_latency = services.list[req_obj.assigned_services[i]-1].latency
            if (curr_latency > max_latency){
                max_latency = curr_latency
            }
        }

        return req_obj.latency + max_latency
    }

    clean_services(reqs:Request[]){

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

    get_avail_workers(num_workers:number,requests:Request[]){

        var num_still_working:number = 0
        for (let i=0;i<requests.length;i++){
            if (requests[i].processing){
                num_still_working += requests[i].processing_count
            }
        }
        return num_still_working
    }

    //build(30,100,15,10,50)
    async testing(iter:number) {
        var utilities:number[] = []
        for (let i = 0;i<iter;i++) {
            console.log("testing " + i.toString())
            await this.build(15,30,5,10,10).then((util)=> {
                utilities.push(util)
            })
        }
        console.log(utilities)
        return utilities
    }



}