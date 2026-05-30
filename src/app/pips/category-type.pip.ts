import { Pipe, PipeTransform } from "@angular/core";
import { Category } from "../models/Category.model";



@Pipe({
    name:'CategoryType'
})


export class CategoryTypePip implements PipeTransform{
    transform(value: any, ...args: any[]) {
       
        if(value == null){
          
                return 'فئه رئيسيه';
        }else{
                return 'فئه فرعيه';
           
             
        }
    }
}