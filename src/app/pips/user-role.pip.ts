import { Pipe, PipeTransform } from "@angular/core";



@Pipe({
    name:'userRole'
})


export class UserRolePip implements PipeTransform{
    transform(value: any, ...args: any[]) {
        switch(value){
            case 'admin':
                return 'مدير موقع';
            case 'sales':
                return 'بائع';
            case 'manager':
                return 'مدير فرع';
         
            default:
                return value;
        }
    }
}