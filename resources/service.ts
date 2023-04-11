import { TimedDependency } from "../../quartermaster/src";

export class Service extends TimedDependency {

    name:string = ""
    service_utility = Math.random()
    latency:number = Math.ceil(Math.random()*5)


}