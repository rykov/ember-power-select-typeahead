/* eslint-disable ember/no-observers */
import { addObserver, removeObserver } from '@ember/object/observers';
import { task, waitForQueue } from 'ember-concurrency';
import { tracked } from '@glimmer/tracking';
import Component from '@glimmer/component';
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
    let oldSelect = this.oldSelect;
    let newSelect = (this.oldSelect = this.args.select);
    if (!oldSelect) {
      this.text = this.getSelectedAsText();
      return;
    }
    /*
     * We need to update the input field with value of the selected option whenever we're closing
     * the select box.
     */
    if (oldSelect.isOpen && !newSelect.isOpen && newSelect.searchText) {
      let input = document.querySelector(
        `#ember-power-select-typeahead-input-${newSelect.uniqueId}`,
      );
      let newText = this.getSelectedAsText();
      if (input.value !== newText) {
        input.value = newText;
      }
      this.text = newText;
    }

    if (newSelect.lastSearchedText !== oldSelect.lastSearchedText) {
      const toClose = isBlank(newSelect.lastSearchedText);
      this.selectActionTask.perform(newSelect, toClose);
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
    let isLetter = (e.keyCode >= 48 && e.keyCode <= 90) || e.keyCode === 32; // Keys 0-9, a-z or SPACE
    // if isLetter, escape or enter, prevent parent handlers from being notified
    if (isLetter || [13, 27].includes(e.keyCode)) {
      // open if loading msg configured
      if (!select.isOpen && this.args.loadingMessage) {
        this.selectActionTask.perform(select, false);
      }
      e.stopPropagation();
    }

    // optional, passed from power-select
    let onkeydown = this.args.onKeydown;
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
    const path = this.args.extra?.labelPath;
    let value = this.args.select.selected;
    if (path && value) value = value[path];
    return value === undefined ? '' : value;
  }

  /**
   * Schedules open/close action on Select API
   *
   * @private
   * @method selectActionTask
   */
  selectActionTask = task({ enqueue: true }, async ({ actions }, toClose) => {
    await waitForQueue('actions');
    toClose ? actions.close(null, true) : actions.open();
  });
}
