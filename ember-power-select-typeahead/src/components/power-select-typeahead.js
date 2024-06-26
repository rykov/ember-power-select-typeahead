import Trigger from './power-select-typeahead/trigger.js';
import { ensureSafeComponent } from '@embroider/util';
import Component from '@glimmer/component';
import { action } from '@ember/object';

const noopKeyDown = () => {};

export default class PowerSelectTypeahead extends Component {
  // Args w/ defaults
  constructor() {
    super(...arguments);
    const triggerComponent = this.args.triggerComponent || Trigger;
    this.triggerComponent = ensureSafeComponent(triggerComponent);
    this.beforeOptionsComponent = this.args.beforeOptionsComponent || null;
    this.noMatchesMessage = this.args.noMatchesMessage || null;
    this.loadingMessage = this.args.loadingMessage || null;
    this.tabindex = this.args.tabindex || -1;
  }

  // CPs
  get concatenatedTriggerClasses() {
    let classes = ['ember-power-select-typeahead-trigger'];
    let passedClass = this.args.triggerClass;
    if (passedClass) {
      classes.push(passedClass);
    }
    return classes.join(' ');
  }

  get concatenatedDropdownClasses() {
    let classes = ['ember-power-select-typeahead-dropdown'];
    let passedClass = this.args.dropdownClass;
    if (passedClass) {
      classes.push(passedClass);
    }
    return classes.join(' ');
  }

  @action onKeyDown(select, e) {
    let action = this.args.onkeydown || noopKeyDown;

    // if user passes `onkeydown` action
    if (action && action(select, e) === false) {
      return false;
    } else {
      // if escape, then clear out selection
      if (e.keyCode === 27) {
        select.actions.choose(null);
      }
    }
  }
}
