/* eslint-disable ember/no-observers */
import { addObserver, removeObserver } from '@ember/object/observers';
import { tracked } from '@glimmer/tracking';
import Component from '@glimmer/component';
import { schedule } from '@ember/runloop';
import { isBlank } from '@ember/utils';
import { action } from '@ember/object';

export default class PowerSelectTypeaheadTrigger extends Component {
  @tracked text = '';

  constructor() {
    super(...arguments);
    addObserver(this, 'args.select', this, 'onUpdatedAttrs');
    this.onUpdatedAttrs();
  }

  willDestroy() {
    super.willDestroy(...arguments);
    removeObserver(this, 'args.select', this, 'onUpdatedAttrs');
  }

  /**
   * Pseudo-Lifecycle Hook
   * power-select updates the state of the publicAPI (select) for every typeahead
   * so we capture this as `state` via oldSelect && newSelect
   *
   * @private
   * @method onUpdatedAttrs
   */
  @action onUpdatedAttrs() {
    const oldSelect = this.oldSelect;
    const newSelect = (this.oldSelect = this.args.select);
    if (!oldSelect) {
      return;
    }
    /*
     * We need to update the input field with value of the selected option whenever we're closing
     * the select box.
     */
    if (oldSelect.isOpen && !newSelect.isOpen && newSelect.searchText) {
      const input = document.querySelector(
        `#ember-power-select-typeahead-input-${newSelect.uniqueId}`,
      );
      const newText = this.getSelectedAsText();
      if (input.value !== newText) {
        input.value = newText;
      }
      this.text = newText;
    }

    if (newSelect.lastSearchedText !== oldSelect.lastSearchedText) {
      if (isBlank(newSelect.lastSearchedText)) {
        schedule('actions', null, newSelect.actions.close, null, true);
      } else {
        schedule('actions', null, newSelect.actions.open);
      }
    }

    if (oldSelect.selected !== newSelect.selected) {
      this.text = this.getSelectedAsText();
    }
  }

  /**
   * on mousedown prevent propagation of event
   *
   * @private
   * @method stopPropagation
   * @param {Object} event
   */
  @action stopPropagation(e) {
    e.stopPropagation();
  }

  /**
   * called from power-select internals
   *
   * @private
   * @method handleKeydown
   * @param {Object} event
   */
  @action handleKeydown(e) {
    const select = this.args.select;

    // up or down arrow and if not open, no-op and prevent parent handlers from being notified
    if ([38, 40].includes(e.keyCode) && !select.isOpen) {
      e.stopPropagation();
      return;
    }
    const isLetter = (e.keyCode >= 48 && e.keyCode <= 90) || e.keyCode === 32; // Keys 0-9, a-z or SPACE
    // if isLetter, escape or enter, prevent parent handlers from being notified
    if (isLetter || [13, 27].includes(e.keyCode)) {
      // open if loading msg configured
      if (!select.isOpen && this.args.loadingMessage) {
        schedule('actions', null, select.actions.open);
      }
      e.stopPropagation();
    }

    // optional, passed from power-select
    const onkeydown = this.args.onKeydown;
    if (onkeydown && onkeydown(e) === false) {
      return false;
    }
  }

  /**
   * obtains seleted value based on complex object or primitive value from power-select publicAPI
   *
   * @private
   * @method getSelectedAsText
   */
  getSelectedAsText() {
    const path = this.args.extra?.labelPath?.replace(/^/, '.');
    const value = this.args.select[`selected${path}`];
    return value === undefined ? '' : value;
  }
}
