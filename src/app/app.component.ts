import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { GlobalsidemenuComponent } from './components/globalsidemenu/globalsidemenu.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, GlobalsidemenuComponent],
})
export class AppComponent {
  constructor() {}
}
