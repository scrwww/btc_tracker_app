import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-globalsidemenu',
  templateUrl: './globalsidemenu.component.html',
  standalone: true,
  styleUrls: ['./globalsidemenu.component.scss'],
  imports: [ IonicModule, RouterModule]
})
export class GlobalsidemenuComponent  implements OnInit {

  constructor() {

   }



  ngOnInit() {}

}
