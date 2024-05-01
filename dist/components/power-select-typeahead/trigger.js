import { buildTask } from 'ember-concurrency/async-arrow-runtime';
import { addObserver, removeObserver } from '@ember/object/observers';
import { waitForQueue } from 'ember-concurrency';
import { tracked } from '@glimmer/tracking';
import Component from '@glimmer/component';
import { isBlank } from '@ember/utils';
import { action } from '@ember/object';
import { precompileTemplate } from '@ember/template-compilation';
import { g, i, n } from 'decorator-transforms/runtime';
import { setComponentTemplate } from '@ember/component';

var TEMPLATE = precompileTemplate("{{! template-lint-disable no-pointer-down-event-binding }}\n<input type=\"search\"\n  value={{this.text}}\n  id=\"ember-power-select-typeahead-input-{{@select.uniqueId}}\"\n  class=\"ember-power-select-typeahead-input ember-power-select-search-input\"\n  autocomplete=\"off\"\n  autocorrect=\"off\"\n  autocapitalize=\"off\"\n  spellcheck=\"false\"\n  placeholder={{@placeholder}}\n  oninput={{@onInput}}\n  onfocus={{@onFocus}}\n  onblur={{@onBlur}}\n  disabled={{@select.disabled}}\n  onkeydown={{this.handleKeydown}}\n  onmousedown={{this.stopPropagation}}>\n{{#if @select.loading}}\n  <span class=\"ember-power-select-typeahead-loading-indicator\"></span>\n{{/if}}\n");

class PowerSelectTypeaheadTrigger extends Component {
  static {
    g(this.prototype, "text", [tracked], function () {
      return '';
    });
  }
  #text = (i(this, "text"), void 0);
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
  onUpdatedAttrs() {
    let oldSelect = this.oldSelect;
    let newSelect = this.oldSelect = this.args.select;
    if (!oldSelect) {
      this.text = this.getSelectedAsText();
      return;
    }
    /*
     * We need to update the input field with value of the selected option whenever we're closing
     * the select box.
     */
    if (oldSelect.isOpen && !newSelect.isOpen && newSelect.searchText) {
      let input = document.querySelector(`#ember-power-select-typeahead-input-${newSelect.uniqueId}`);
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
  static {
    n(this.prototype, "onUpdatedAttrs", [action]);
  }
  stopPropagation(e) {
    e.stopPropagation();
  }

  /**
   * called from power-select internals
   *
   * @private
   * @method handleKeydown
   * @param {Object} event
   */
  static {
    n(this.prototype, "stopPropagation", [action]);
  }
  handleKeydown(e) {
    const select = this.args.select;

    // up or down arrow and if not open, no-op and prevent parent handlers from being notified
    if ([38, 40].includes(e.keyCode) && !select.isOpen) {
      e.stopPropagation();
      return;
    }
    let isLetter = e.keyCode >= 48 && e.keyCode <= 90 || e.keyCode === 32; // Keys 0-9, a-z or SPACE
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
  static {
    n(this.prototype, "handleKeydown", [action]);
  }
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
  selectActionTask = buildTask(() => ({
    context: this,
    generator: function* ({
      actions
    }, toClose) {
      yield waitForQueue('actions');
      toClose ? actions.close(null, true) : actions.open();
    }
  }), {
    enqueue: true
  }, "selectActionTask", null);
}
setComponentTemplate(TEMPLATE, PowerSelectTypeaheadTrigger);

export { PowerSelectTypeaheadTrigger as default };
//# sourceMappingURL=trigger.js.map
