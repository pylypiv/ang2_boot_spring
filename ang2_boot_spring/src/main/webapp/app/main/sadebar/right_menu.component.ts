import {Component, trigger, state, style, transition, animate} from '@angular/core';
import {RightMenuPanelComponent} from './right_menu.panel.component';

@Component({
  selector: 'side-bar-btn',
  templateUrl: 'app/main/sadebar/right_menu.component.html',
  //styleUrls: ['app/main/sadebar/right_menu.component.css'],
  animations: [
    trigger('slInOut', [
      state('in', style({
        transform: 'translate3d(0, 0, 0)'
      })),
      state('out', style({
        transform: 'translate3d(100%, 0, 0)'
      })),
      transition('in => out', animate('400ms ease-in-out')),
      transition('out => in', animate('400ms ease-in-out'))
    ])
  ]
})
export class RightMenuComponent {

  menuState:string = 'out';

  toggleMenu() {
    // 1-line if statement that toggles the value:
    this.menuState = this.menuState === 'out' ? 'in' : 'out';
  }
  
  onVoted(agreed: boolean) {
   // agreed ? this.agreed++ : this.disagreed++;
   //alert('okkk');
   this.toggleMenu();
  }
}

