//#region ../../node_modules/.pnpm/@lit+reactive-element@2.1.0/node_modules/@lit/reactive-element/development/css-tag.d.ts
/**
 * A CSSResult or native CSSStyleSheet.
 *
 * In browsers that support constructible CSS style sheets, CSSStyleSheet
 * object can be used for styling along side CSSResult from the `css`
 * template tag.
 */
type CSSResultOrNative = CSSResult | CSSStyleSheet;
type CSSResultArray = Array<CSSResultOrNative | CSSResultArray>;
/**
 * A single CSSResult, CSSStyleSheet, or an array or nested arrays of those.
 */
type CSSResultGroup = CSSResultOrNative | CSSResultArray;
/**
 * A container for a string of CSS text, that may be used to create a CSSStyleSheet.
 *
 * CSSResult is the return value of `css`-tagged template literals and
 * `unsafeCSS()`. In order to ensure that CSSResults are only created via the
 * `css` tag and `unsafeCSS()`, CSSResult cannot be constructed directly.
 */
declare class CSSResult {
  ['_$cssResult$']: boolean;
  readonly cssText: string;
  private _styleSheet?;
  private _strings;
  private constructor();
  get styleSheet(): CSSStyleSheet | undefined;
  toString(): string;
}
//#endregion
//#region ../../node_modules/.pnpm/@lit+reactive-element@2.1.0/node_modules/@lit/reactive-element/development/reactive-controller.d.ts
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/**
 * An object that can host Reactive Controllers and call their lifecycle
 * callbacks.
 */
interface ReactiveControllerHost {
  /**
   * Adds a controller to the host, which sets up the controller's lifecycle
   * methods to be called with the host's lifecycle.
   */
  addController(controller: ReactiveController): void;
  /**
   * Removes a controller from the host.
   */
  removeController(controller: ReactiveController): void;
  /**
   * Requests a host update which is processed asynchronously. The update can
   * be waited on via the `updateComplete` property.
   */
  requestUpdate(): void;
  /**
   * Returns a Promise that resolves when the host has completed updating.
   * The Promise value is a boolean that is `true` if the element completed the
   * update without triggering another update. The Promise result is `false` if
   * a property was set inside `updated()`. If the Promise is rejected, an
   * exception was thrown during the update.
   *
   * @return A promise of a boolean that indicates if the update resolved
   *     without triggering another update.
   */
  readonly updateComplete: Promise<boolean>;
}
/**
 * A Reactive Controller is an object that enables sub-component code
 * organization and reuse by aggregating the state, behavior, and lifecycle
 * hooks related to a single feature.
 *
 * Controllers are added to a host component, or other object that implements
 * the `ReactiveControllerHost` interface, via the `addController()` method.
 * They can hook their host components's lifecycle by implementing one or more
 * of the lifecycle callbacks, or initiate an update of the host component by
 * calling `requestUpdate()` on the host.
 */
interface ReactiveController {
  /**
   * Called when the host is connected to the component tree. For custom
   * element hosts, this corresponds to the `connectedCallback()` lifecycle,
   * which is only called when the component is connected to the document.
   */
  hostConnected?(): void;
  /**
   * Called when the host is disconnected from the component tree. For custom
   * element hosts, this corresponds to the `disconnectedCallback()` lifecycle,
   * which is called the host or an ancestor component is disconnected from the
   * document.
   */
  hostDisconnected?(): void;
  /**
   * Called during the client-side host update, just before the host calls
   * its own update.
   *
   * Code in `update()` can depend on the DOM as it is not called in
   * server-side rendering.
   */
  hostUpdate?(): void;
  /**
   * Called after a host update, just before the host calls firstUpdated and
   * updated. It is not called in server-side rendering.
   *
   */
  hostUpdated?(): void;
}
//#endregion
//#region ../../node_modules/.pnpm/@lit+reactive-element@2.1.0/node_modules/@lit/reactive-element/development/reactive-element.d.ts
/**
 * Converts property values to and from attribute values.
 */
interface ComplexAttributeConverter<Type = unknown, TypeHint = unknown> {
  /**
   * Called to convert an attribute value to a property
   * value.
   */
  fromAttribute?(value: string | null, type?: TypeHint): Type;
  /**
   * Called to convert a property value to an attribute
   * value.
   *
   * It returns unknown instead of string, to be compatible with
   * https://github.com/WICG/trusted-types (and similar efforts).
   */
  toAttribute?(value: Type, type?: TypeHint): unknown;
}
type AttributeConverter<Type = unknown, TypeHint = unknown> = ComplexAttributeConverter<Type> | ((value: string | null, type?: TypeHint) => Type);
/**
 * Defines options for a property accessor.
 */
interface PropertyDeclaration<Type = unknown, TypeHint = unknown> {
  /**
   * When set to `true`, indicates the property is internal private state. The
   * property should not be set by users. When using TypeScript, this property
   * should be marked as `private` or `protected`, and it is also a common
   * practice to use a leading `_` in the name. The property is not added to
   * `observedAttributes`.
   */
  readonly state?: boolean;
  /**
   * Indicates how and whether the property becomes an observed attribute.
   * If the value is `false`, the property is not added to `observedAttributes`.
   * If true or absent, the lowercased property name is observed (e.g. `fooBar`
   * becomes `foobar`). If a string, the string value is observed (e.g
   * `attribute: 'foo-bar'`).
   */
  readonly attribute?: boolean | string;
  /**
   * Indicates the type of the property. This is used only as a hint for the
   * `converter` to determine how to convert the attribute
   * to/from a property.
   */
  readonly type?: TypeHint;
  /**
   * Indicates how to convert the attribute to/from a property. If this value
   * is a function, it is used to convert the attribute value a the property
   * value. If it's an object, it can have keys for `fromAttribute` and
   * `toAttribute`. If no `toAttribute` function is provided and
   * `reflect` is set to `true`, the property value is set directly to the
   * attribute. A default `converter` is used if none is provided; it supports
   * `Boolean`, `String`, `Number`, `Object`, and `Array`. Note,
   * when a property changes and the converter is used to update the attribute,
   * the property is never updated again as a result of the attribute changing,
   * and vice versa.
   */
  readonly converter?: AttributeConverter<Type, TypeHint>;
  /**
   * Indicates if the property should reflect to an attribute.
   * If `true`, when the property is set, the attribute is set using the
   * attribute name determined according to the rules for the `attribute`
   * property option and the value of the property converted using the rules
   * from the `converter` property option.
   */
  readonly reflect?: boolean;
  /**
   * A function that indicates if a property should be considered changed when
   * it is set. The function should take the `newValue` and `oldValue` and
   * return `true` if an update should be requested.
   */
  hasChanged?(value: Type, oldValue: Type): boolean;
  /**
   * Indicates whether an accessor will be created for this property. By
   * default, an accessor will be generated for this property that requests an
   * update when set. If this flag is `true`, no accessor will be created, and
   * it will be the user's responsibility to call
   * `this.requestUpdate(propertyName, oldValue)` to request an update when
   * the property changes.
   */
  readonly noAccessor?: boolean;
  /**
   * When `true`, uses the initial value of the property as the default value,
   * which changes how attributes are handled:
   *  - The initial value does *not* reflect, even if the `reflect` option is `true`.
   *    Subsequent changes to the property will reflect, even if they are equal to the
   *     default value.
   *  - When the attribute is removed, the property is set to the default value
   *  - The initial value will not trigger an old value in the `changedProperties` map
   *    argument to update lifecycle methods.
   *
   * When set, properties must be initialized, either with a field initializer, or an
   * assignment in the constructor. Not initializing the property may lead to
   * improper handling of subsequent property assignments.
   *
   * While this behavior is opt-in, most properties that reflect to attributes should
   * use `useDefault: true` so that their initial values do not reflect.
   */
  useDefault?: boolean;
}
/**
 * Map of properties to PropertyDeclaration options. For each property an
 * accessor is made, and the property is processed according to the
 * PropertyDeclaration options.
 */
interface PropertyDeclarations {
  readonly [key: string]: PropertyDeclaration;
}
type PropertyDeclarationMap = Map<PropertyKey, PropertyDeclaration>;
/**
 * A Map of property keys to values.
 *
 * Takes an optional type parameter T, which when specified as a non-any,
 * non-unknown type, will make the Map more strongly-typed, associating the map
 * keys with their corresponding value type on T.
 *
 * Use `PropertyValues<this>` when overriding ReactiveElement.update() and
 * other lifecycle methods in order to get stronger type-checking on keys
 * and values.
 */
type PropertyValues<T = any> = T extends object ? PropertyValueMap<T> : Map<PropertyKey, unknown>;
/**
 * Do not use, instead prefer {@linkcode PropertyValues}.
 */
interface PropertyValueMap<T> extends Map<PropertyKey, unknown> {
  get<K extends keyof T>(k: K): T[K] | undefined;
  set<K extends keyof T>(key: K, value: T[K]): this;
  has<K extends keyof T>(k: K): boolean;
  delete<K extends keyof T>(k: K): boolean;
}
/**
 * A string representing one of the supported dev mode warning categories.
 */
type WarningKind = 'change-in-update' | 'migration' | 'async-perform-update';
type Initializer = (element: ReactiveElement) => void;
declare global {
  interface SymbolConstructor {
    readonly metadata: unique symbol;
  }
}
declare global {
  var litPropertyMetadata: WeakMap<object, Map<PropertyKey, PropertyDeclaration>>;
}
/**
 * Base element class which manages element properties and attributes. When
 * properties change, the `update` method is asynchronously called. This method
 * should be supplied by subclasses to render updates as desired.
 * @noInheritDoc
 */
declare abstract class ReactiveElement extends HTMLElement implements ReactiveControllerHost {
  /**
   * Read or set all the enabled warning categories for this class.
   *
   * This property is only used in development builds.
   *
   * @nocollapse
   * @category dev-mode
   */
  static enabledWarnings?: WarningKind[];
  /**
   * Enable the given warning category for this class.
   *
   * This method only exists in development builds, so it should be accessed
   * with a guard like:
   *
   * ```ts
   * // Enable for all ReactiveElement subclasses
   * ReactiveElement.enableWarning?.('migration');
   *
   * // Enable for only MyElement and subclasses
   * MyElement.enableWarning?.('migration');
   * ```
   *
   * @nocollapse
   * @category dev-mode
   */
  static enableWarning?: (warningKind: WarningKind) => void;
  /**
   * Disable the given warning category for this class.
   *
   * This method only exists in development builds, so it should be accessed
   * with a guard like:
   *
   * ```ts
   * // Disable for all ReactiveElement subclasses
   * ReactiveElement.disableWarning?.('migration');
   *
   * // Disable for only MyElement and subclasses
   * MyElement.disableWarning?.('migration');
   * ```
   *
   * @nocollapse
   * @category dev-mode
   */
  static disableWarning?: (warningKind: WarningKind) => void;
  /**
   * Adds an initializer function to the class that is called during instance
   * construction.
   *
   * This is useful for code that runs against a `ReactiveElement`
   * subclass, such as a decorator, that needs to do work for each
   * instance, such as setting up a `ReactiveController`.
   *
   * ```ts
   * const myDecorator = (target: typeof ReactiveElement, key: string) => {
   *   target.addInitializer((instance: ReactiveElement) => {
   *     // This is run during construction of the element
   *     new MyController(instance);
   *   });
   * }
   * ```
   *
   * Decorating a field will then cause each instance to run an initializer
   * that adds a controller:
   *
   * ```ts
   * class MyElement extends LitElement {
   *   @myDecorator foo;
   * }
   * ```
   *
   * Initializers are stored per-constructor. Adding an initializer to a
   * subclass does not add it to a superclass. Since initializers are run in
   * constructors, initializers will run in order of the class hierarchy,
   * starting with superclasses and progressing to the instance's class.
   *
   * @nocollapse
   */
  static addInitializer(initializer: Initializer): void;
  static _initializers?: Initializer[];
  /**
   * Maps attribute names to properties; for example `foobar` attribute to
   * `fooBar` property. Created lazily on user subclasses when finalizing the
   * class.
   * @nocollapse
   */
  private static __attributeToPropertyMap;
  /**
   * Marks class as having been finalized, which includes creating properties
   * from `static properties`, but does *not* include all properties created
   * from decorators.
   * @nocollapse
   */
  protected static finalized: true | undefined;
  /**
   * Memoized list of all element properties, including any superclass
   * properties. Created lazily on user subclasses when finalizing the class.
   *
   * @nocollapse
   * @category properties
   */
  static elementProperties: PropertyDeclarationMap;
  /**
   * User-supplied object that maps property names to `PropertyDeclaration`
   * objects containing options for configuring reactive properties. When
   * a reactive property is set the element will update and render.
   *
   * By default properties are public fields, and as such, they should be
   * considered as primarily settable by element users, either via attribute or
   * the property itself.
   *
   * Generally, properties that are changed by the element should be private or
   * protected fields and should use the `state: true` option. Properties
   * marked as `state` do not reflect from the corresponding attribute
   *
   * However, sometimes element code does need to set a public property. This
   * should typically only be done in response to user interaction, and an event
   * should be fired informing the user; for example, a checkbox sets its
   * `checked` property when clicked and fires a `changed` event. Mutating
   * public properties should typically not be done for non-primitive (object or
   * array) properties. In other cases when an element needs to manage state, a
   * private property set with the `state: true` option should be used. When
   * needed, state properties can be initialized via public properties to
   * facilitate complex interactions.
   * @nocollapse
   * @category properties
   */
  static properties: PropertyDeclarations;
  /**
   * Memoized list of all element styles.
   * Created lazily on user subclasses when finalizing the class.
   * @nocollapse
   * @category styles
   */
  static elementStyles: Array<CSSResultOrNative>;
  /**
   * Array of styles to apply to the element. The styles should be defined
   * using the {@linkcode css} tag function, via constructible stylesheets, or
   * imported from native CSS module scripts.
   *
   * Note on Content Security Policy:
   *
   * Element styles are implemented with `<style>` tags when the browser doesn't
   * support adopted StyleSheets. To use such `<style>` tags with the style-src
   * CSP directive, the style-src value must either include 'unsafe-inline' or
   * `nonce-<base64-value>` with `<base64-value>` replaced be a server-generated
   * nonce.
   *
   * To provide a nonce to use on generated `<style>` elements, set
   * `window.litNonce` to a server-generated nonce in your page's HTML, before
   * loading application code:
   *
   * ```html
   * <script>
   *   // Generated and unique per request:
   *   window.litNonce = 'a1b2c3d4';
   * </script>
   * ```
   * @nocollapse
   * @category styles
   */
  static styles?: CSSResultGroup;
  /**
   * Returns a list of attributes corresponding to the registered properties.
   * @nocollapse
   * @category attributes
   */
  static get observedAttributes(): string[];
  private __instanceProperties?;
  /**
   * Creates a property accessor on the element prototype if one does not exist
   * and stores a {@linkcode PropertyDeclaration} for the property with the
   * given options. The property setter calls the property's `hasChanged`
   * property option or uses a strict identity check to determine whether or not
   * to request an update.
   *
   * This method may be overridden to customize properties; however,
   * when doing so, it's important to call `super.createProperty` to ensure
   * the property is setup correctly. This method calls
   * `getPropertyDescriptor` internally to get a descriptor to install.
   * To customize what properties do when they are get or set, override
   * `getPropertyDescriptor`. To customize the options for a property,
   * implement `createProperty` like this:
   *
   * ```ts
   * static createProperty(name, options) {
   *   options = Object.assign(options, {myOption: true});
   *   super.createProperty(name, options);
   * }
   * ```
   *
   * @nocollapse
   * @category properties
   */
  static createProperty(name: PropertyKey, options?: PropertyDeclaration): void;
  /**
   * Returns a property descriptor to be defined on the given named property.
   * If no descriptor is returned, the property will not become an accessor.
   * For example,
   *
   * ```ts
   * class MyElement extends LitElement {
   *   static getPropertyDescriptor(name, key, options) {
   *     const defaultDescriptor =
   *         super.getPropertyDescriptor(name, key, options);
   *     const setter = defaultDescriptor.set;
   *     return {
   *       get: defaultDescriptor.get,
   *       set(value) {
   *         setter.call(this, value);
   *         // custom action.
   *       },
   *       configurable: true,
   *       enumerable: true
   *     }
   *   }
   * }
   * ```
   *
   * @nocollapse
   * @category properties
   */
  protected static getPropertyDescriptor(name: PropertyKey, key: string | symbol, options: PropertyDeclaration): PropertyDescriptor | undefined;
  /**
   * Returns the property options associated with the given property.
   * These options are defined with a `PropertyDeclaration` via the `properties`
   * object or the `@property` decorator and are registered in
   * `createProperty(...)`.
   *
   * Note, this method should be considered "final" and not overridden. To
   * customize the options for a given property, override
   * {@linkcode createProperty}.
   *
   * @nocollapse
   * @final
   * @category properties
   */
  static getPropertyOptions(name: PropertyKey): PropertyDeclaration<unknown, unknown>;
  static [Symbol.metadata]: object & Record<PropertyKey, unknown>;
  /**
   * Initializes static own properties of the class used in bookkeeping
   * for element properties, initializers, etc.
   *
   * Can be called multiple times by code that needs to ensure these
   * properties exist before using them.
   *
   * This method ensures the superclass is finalized so that inherited
   * property metadata can be copied down.
   * @nocollapse
   */
  private static __prepare;
  /**
   * Finishes setting up the class so that it's ready to be registered
   * as a custom element and instantiated.
   *
   * This method is called by the ReactiveElement.observedAttributes getter.
   * If you override the observedAttributes getter, you must either call
   * super.observedAttributes to trigger finalization, or call finalize()
   * yourself.
   *
   * @nocollapse
   */
  protected static finalize(): void;
  /**
   * Options used when calling `attachShadow`. Set this property to customize
   * the options for the shadowRoot; for example, to create a closed
   * shadowRoot: `{mode: 'closed'}`.
   *
   * Note, these options are used in `createRenderRoot`. If this method
   * is customized, options should be respected if possible.
   * @nocollapse
   * @category rendering
   */
  static shadowRootOptions: ShadowRootInit;
  /**
   * Takes the styles the user supplied via the `static styles` property and
   * returns the array of styles to apply to the element.
   * Override this method to integrate into a style management system.
   *
   * Styles are deduplicated preserving the _last_ instance in the list. This
   * is a performance optimization to avoid duplicated styles that can occur
   * especially when composing via subclassing. The last item is kept to try
   * to preserve the cascade order with the assumption that it's most important
   * that last added styles override previous styles.
   *
   * @nocollapse
   * @category styles
   */
  protected static finalizeStyles(styles?: CSSResultGroup): Array<CSSResultOrNative>;
  /**
   * Node or ShadowRoot into which element DOM should be rendered. Defaults
   * to an open shadowRoot.
   * @category rendering
   */
  readonly renderRoot: HTMLElement | DocumentFragment;
  /**
   * Returns the property name for the given attribute `name`.
   * @nocollapse
   */
  private static __attributeNameForProperty;
  private __updatePromise;
  /**
   * True if there is a pending update as a result of calling `requestUpdate()`.
   * Should only be read.
   * @category updates
   */
  isUpdatePending: boolean;
  /**
   * Is set to `true` after the first update. The element code cannot assume
   * that `renderRoot` exists before the element `hasUpdated`.
   * @category updates
   */
  hasUpdated: boolean;
  /**
   * Records property default values when the
   * `useDefault` option is used.
   */
  private __defaultValues?;
  /**
   * Properties that should be reflected when updated.
   */
  private __reflectingProperties?;
  /**
   * Name of currently reflecting property
   */
  private __reflectingProperty;
  /**
   * Set of controllers.
   */
  private __controllers?;
  constructor();
  /**
   * Internal only override point for customizing work done when elements
   * are constructed.
   */
  private __initialize;
  /**
   * Registers a `ReactiveController` to participate in the element's reactive
   * update cycle. The element automatically calls into any registered
   * controllers during its lifecycle callbacks.
   *
   * If the element is connected when `addController()` is called, the
   * controller's `hostConnected()` callback will be immediately called.
   * @category controllers
   */
  addController(controller: ReactiveController): void;
  /**
   * Removes a `ReactiveController` from the element.
   * @category controllers
   */
  removeController(controller: ReactiveController): void;
  /**
   * Fixes any properties set on the instance before upgrade time.
   * Otherwise these would shadow the accessor and break these properties.
   * The properties are stored in a Map which is played back after the
   * constructor runs.
   */
  private __saveInstanceProperties;
  /**
   * Returns the node into which the element should render and by default
   * creates and returns an open shadowRoot. Implement to customize where the
   * element's DOM is rendered. For example, to render into the element's
   * childNodes, return `this`.
   *
   * @return Returns a node into which to render.
   * @category rendering
   */
  protected createRenderRoot(): HTMLElement | DocumentFragment;
  /**
   * On first connection, creates the element's renderRoot, sets up
   * element styling, and enables updating.
   * @category lifecycle
   */
  connectedCallback(): void;
  /**
   * Note, this method should be considered final and not overridden. It is
   * overridden on the element instance with a function that triggers the first
   * update.
   * @category updates
   */
  protected enableUpdating(_requestedUpdate: boolean): void;
  /**
   * Allows for `super.disconnectedCallback()` in extensions while
   * reserving the possibility of making non-breaking feature additions
   * when disconnecting at some point in the future.
   * @category lifecycle
   */
  disconnectedCallback(): void;
  /**
   * Synchronizes property values when attributes change.
   *
   * Specifically, when an attribute is set, the corresponding property is set.
   * You should rarely need to implement this callback. If this method is
   * overridden, `super.attributeChangedCallback(name, _old, value)` must be
   * called.
   *
   * See [responding to attribute changes](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements#responding_to_attribute_changes)
   * on MDN for more information about the `attributeChangedCallback`.
   * @category attributes
   */
  attributeChangedCallback(name: string, _old: string | null, value: string | null): void;
  private __propertyToAttribute;
  /**
   * Requests an update which is processed asynchronously. This should be called
   * when an element should update based on some state not triggered by setting
   * a reactive property. In this case, pass no arguments. It should also be
   * called when manually implementing a property setter. In this case, pass the
   * property `name` and `oldValue` to ensure that any configured property
   * options are honored.
   *
   * @param name name of requesting property
   * @param oldValue old value of requesting property
   * @param options property options to use instead of the previously
   *     configured options
   * @category updates
   */
  requestUpdate(name?: PropertyKey, oldValue?: unknown, options?: PropertyDeclaration): void;
  /**
   * Sets up the element to asynchronously update.
   */
  private __enqueueUpdate;
  /**
   * Schedules an element update. You can override this method to change the
   * timing of updates by returning a Promise. The update will await the
   * returned Promise, and you should resolve the Promise to allow the update
   * to proceed. If this method is overridden, `super.scheduleUpdate()`
   * must be called.
   *
   * For instance, to schedule updates to occur just before the next frame:
   *
   * ```ts
   * override protected async scheduleUpdate(): Promise<unknown> {
   *   await new Promise((resolve) => requestAnimationFrame(() => resolve()));
   *   super.scheduleUpdate();
   * }
   * ```
   * @category updates
   */
  protected scheduleUpdate(): void | Promise<unknown>;
  /**
   * Performs an element update. Note, if an exception is thrown during the
   * update, `firstUpdated` and `updated` will not be called.
   *
   * Call `performUpdate()` to immediately process a pending update. This should
   * generally not be needed, but it can be done in rare cases when you need to
   * update synchronously.
   *
   * @category updates
   */
  protected performUpdate(): void;
  /**
   * Invoked before `update()` to compute values needed during the update.
   *
   * Implement `willUpdate` to compute property values that depend on other
   * properties and are used in the rest of the update process.
   *
   * ```ts
   * willUpdate(changedProperties) {
   *   // only need to check changed properties for an expensive computation.
   *   if (changedProperties.has('firstName') || changedProperties.has('lastName')) {
   *     this.sha = computeSHA(`${this.firstName} ${this.lastName}`);
   *   }
   * }
   *
   * render() {
   *   return html`SHA: ${this.sha}`;
   * }
   * ```
   *
   * @category updates
   */
  protected willUpdate(_changedProperties: PropertyValues): void;
  private __markUpdated;
  /**
   * Returns a Promise that resolves when the element has completed updating.
   * The Promise value is a boolean that is `true` if the element completed the
   * update without triggering another update. The Promise result is `false` if
   * a property was set inside `updated()`. If the Promise is rejected, an
   * exception was thrown during the update.
   *
   * To await additional asynchronous work, override the `getUpdateComplete`
   * method. For example, it is sometimes useful to await a rendered element
   * before fulfilling this Promise. To do this, first await
   * `super.getUpdateComplete()`, then any subsequent state.
   *
   * @return A promise of a boolean that resolves to true if the update completed
   *     without triggering another update.
   * @category updates
   */
  get updateComplete(): Promise<boolean>;
  /**
   * Override point for the `updateComplete` promise.
   *
   * It is not safe to override the `updateComplete` getter directly due to a
   * limitation in TypeScript which means it is not possible to call a
   * superclass getter (e.g. `super.updateComplete.then(...)`) when the target
   * language is ES5 (https://github.com/microsoft/TypeScript/issues/338).
   * This method should be overridden instead. For example:
   *
   * ```ts
   * class MyElement extends LitElement {
   *   override async getUpdateComplete() {
   *     const result = await super.getUpdateComplete();
   *     await this._myChild.updateComplete;
   *     return result;
   *   }
   * }
   * ```
   *
   * @return A promise of a boolean that resolves to true if the update completed
   *     without triggering another update.
   * @category updates
   */
  protected getUpdateComplete(): Promise<boolean>;
  /**
   * Controls whether or not `update()` should be called when the element requests
   * an update. By default, this method always returns `true`, but this can be
   * customized to control when to update.
   *
   * @param _changedProperties Map of changed properties with old values
   * @category updates
   */
  protected shouldUpdate(_changedProperties: PropertyValues): boolean;
  /**
   * Updates the element. This method reflects property values to attributes.
   * It can be overridden to render and keep updated element DOM.
   * Setting properties inside this method will *not* trigger
   * another update.
   *
   * @param _changedProperties Map of changed properties with old values
   * @category updates
   */
  protected update(_changedProperties: PropertyValues): void;
  /**
   * Invoked whenever the element is updated. Implement to perform
   * post-updating tasks via DOM APIs, for example, focusing an element.
   *
   * Setting properties inside this method will trigger the element to update
   * again after this update cycle completes.
   *
   * @param _changedProperties Map of changed properties with old values
   * @category updates
   */
  protected updated(_changedProperties: PropertyValues): void;
  /**
   * Invoked when the element is first updated. Implement to perform one time
   * work on the element after update.
   *
   * ```ts
   * firstUpdated() {
   *   this.renderRoot.getElementById('my-text-area').focus();
   * }
   * ```
   *
   * Setting properties inside this method will trigger the element to update
   * again after this update cycle completes.
   *
   * @param _changedProperties Map of changed properties with old values
   * @category updates
   */
  protected firstUpdated(_changedProperties: PropertyValues): void;
}
//#endregion
//#region ../../node_modules/.pnpm/lit-html@3.3.0/node_modules/lit-html/development/lit-html.d.ts
/** TemplateResult types */
declare const HTML_RESULT = 1;
declare const SVG_RESULT = 2;
declare const MATHML_RESULT = 3;
type ResultType = typeof HTML_RESULT | typeof SVG_RESULT | typeof MATHML_RESULT;
/**
 * The return type of the template tag functions, {@linkcode html} and
 * {@linkcode svg} when it hasn't been compiled by @lit-labs/compiler.
 *
 * A `TemplateResult` object holds all the information about a template
 * expression required to render it: the template strings, expression values,
 * and type of template (html or svg).
 *
 * `TemplateResult` objects do not create any DOM on their own. To create or
 * update DOM you need to render the `TemplateResult`. See
 * [Rendering](https://lit.dev/docs/components/rendering) for more information.
 *
 */
type UncompiledTemplateResult<T extends ResultType = ResultType> = {
  ['_$litType$']: T;
  strings: TemplateStringsArray;
  values: unknown[];
};
/**
 * The return type of the template tag functions, {@linkcode html} and
 * {@linkcode svg}.
 *
 * A `TemplateResult` object holds all the information about a template
 * expression required to render it: the template strings, expression values,
 * and type of template (html or svg).
 *
 * `TemplateResult` objects do not create any DOM on their own. To create or
 * update DOM you need to render the `TemplateResult`. See
 * [Rendering](https://lit.dev/docs/components/rendering) for more information.
 *
 * In Lit 4, this type will be an alias of
 * MaybeCompiledTemplateResult, so that code will get type errors if it assumes
 * that Lit templates are not compiled. When deliberately working with only
 * one, use either {@linkcode CompiledTemplateResult} or
 * {@linkcode UncompiledTemplateResult} explicitly.
 */
type TemplateResult<T extends ResultType = ResultType> = UncompiledTemplateResult<T>;
/**
 * Object specifying options for controlling lit-html rendering. Note that
 * while `render` may be called multiple times on the same `container` (and
 * `renderBefore` reference node) to efficiently update the rendered content,
 * only the options passed in during the first render are respected during
 * the lifetime of renders to that unique `container` + `renderBefore`
 * combination.
 */
interface RenderOptions {
  /**
   * An object to use as the `this` value for event listeners. It's often
   * useful to set this to the host component rendering a template.
   */
  host?: object;
  /**
   * A DOM node before which to render content in the container.
   */
  renderBefore?: ChildNode | null;
  /**
   * Node used for cloning the template (`importNode` will be called on this
   * node). This controls the `ownerDocument` of the rendered DOM, along with
   * any inherited context. Defaults to the global `document`.
   */
  creationScope?: {
    importNode(node: Node, deep?: boolean): Node;
  };
  /**
   * The initial connected state for the top-level part being rendered. If no
   * `isConnected` option is set, `AsyncDirective`s will be connected by
   * default. Set to `false` if the initial render occurs in a disconnected tree
   * and `AsyncDirective`s should see `isConnected === false` for their initial
   * render. The `part.setConnected()` method must be used subsequent to initial
   * render to change the connected state of the part.
   */
  isConnected?: boolean;
}
//#endregion
//#region ../../node_modules/.pnpm/lit-element@4.2.0/node_modules/lit-element/development/lit-element.d.ts
/**
 * Base element class that manages element properties and attributes, and
 * renders a lit-html template.
 *
 * To define a component, subclass `LitElement` and implement a
 * `render` method to provide the component's template. Define properties
 * using the {@linkcode LitElement.properties properties} property or the
 * {@linkcode property} decorator.
 */
declare class LitElement extends ReactiveElement {
  static ['_$litElement$']: boolean;
  /**
   * @category rendering
   */
  readonly renderOptions: RenderOptions;
  private __childPart;
  /**
   * @category rendering
   */
  protected createRenderRoot(): HTMLElement | DocumentFragment;
  /**
   * Updates the element. This method reflects property values to attributes
   * and calls `render` to render DOM via lit-html. Setting properties inside
   * this method will *not* trigger another update.
   * @param changedProperties Map of changed properties with old values
   * @category updates
   */
  protected update(changedProperties: PropertyValues): void;
  /**
   * Invoked when the component is added to the document's DOM.
   *
   * In `connectedCallback()` you should setup tasks that should only occur when
   * the element is connected to the document. The most common of these is
   * adding event listeners to nodes external to the element, like a keydown
   * event handler added to the window.
   *
   * ```ts
   * connectedCallback() {
   *   super.connectedCallback();
   *   addEventListener('keydown', this._handleKeydown);
   * }
   * ```
   *
   * Typically, anything done in `connectedCallback()` should be undone when the
   * element is disconnected, in `disconnectedCallback()`.
   *
   * @category lifecycle
   */
  connectedCallback(): void;
  /**
   * Invoked when the component is removed from the document's DOM.
   *
   * This callback is the main signal to the element that it may no longer be
   * used. `disconnectedCallback()` should ensure that nothing is holding a
   * reference to the element (such as event listeners added to nodes external
   * to the element), so that it is free to be garbage collected.
   *
   * ```ts
   * disconnectedCallback() {
   *   super.disconnectedCallback();
   *   window.removeEventListener('keydown', this._handleKeydown);
   * }
   * ```
   *
   * An element may be re-connected after being disconnected.
   *
   * @category lifecycle
   */
  disconnectedCallback(): void;
  /**
   * Invoked on each update to perform rendering tasks. This method may return
   * any value renderable by lit-html's `ChildPart` - typically a
   * `TemplateResult`. Setting properties inside this method will *not* trigger
   * the element to update.
   * @category rendering
   */
  protected render(): unknown;
}
//#endregion
//#region ../web/dist/index.d.ts
declare var m: {
  new (e: any): {
    _canvas: any;
    _id: string;
    _worker: any;
    _pendingConfig: any;
    _handleWorkerEvent(n: any): Promise<void>;
    _create(e: any): Promise<void>;
    _created: boolean | undefined;
    get loopCount(): any;
    get isLoaded(): any;
    get isPlaying(): any;
    get isPaused(): any;
    get isStopped(): any;
    get currentFrame(): any;
    get isFrozen(): any;
    get segmentDuration(): any;
    get totalFrames(): any;
    get segment(): any;
    get speed(): any;
    get duration(): any;
    get isReady(): any;
    get mode(): any;
    get canvas(): any;
    setCanvas(e: any): Promise<void>;
    get autoplay(): any;
    get backgroundColor(): any;
    get loop(): any;
    get useFrameInterpolation(): any;
    get renderConfig(): any;
    get manifest(): any;
    get activeAnimationId(): any;
    get marker(): any;
    get activeThemeId(): any;
    get layout(): any;
    play(): Promise<void>;
    pause(): Promise<void>;
    stop(): Promise<void>;
    setSpeed(e: any): Promise<void>;
    setMode(e: any): Promise<void>;
    setFrame(e: any): Promise<void>;
    setSegment(e: any, t: any): Promise<void>;
    setRenderConfig(e: any): Promise<void>;
    setUseFrameInterpolation(e: any): Promise<void>;
    setTheme(e: any): Promise<any>;
    load(e: any): Promise<void>;
    setLoop(e: any): Promise<void>;
    setLoopCount(e: any): Promise<void>;
    resize(): Promise<void>;
    destroy(): Promise<void>;
    freeze(): Promise<void>;
    unfreeze(): Promise<void>;
    setBackgroundColor(e: any): Promise<void>;
    loadAnimation(e: any): Promise<void>;
    setLayout(e: any): Promise<void>;
    setSlots(e: any): Promise<void>;
    getSlotIds(): Promise<any>;
    getSlotType(e: any): Promise<any>;
    getSlot(e: any): Promise<any>;
    getSlots(): Promise<any>;
    setColorSlot(e: any, t: any): Promise<any>;
    setScalarSlot(e: any, t: any): Promise<any>;
    setVectorSlot(e: any, t: any): Promise<any>;
    setGradientSlot(e: any, t: any, n: any): Promise<any>;
    setTextSlot(e: any, t: any): Promise<any>;
    resetSlot(e: any): Promise<any>;
    clearSlot(e: any): Promise<any>;
    resetSlots(): Promise<any>;
    clearSlots(): Promise<any>;
    _updateDotLottieInstanceState(): Promise<void>;
    _dotLottieInstanceState: any;
    markers(): any;
    setMarker(e: any): Promise<void>;
    setThemeData(e: any): Promise<any>;
    setViewport(e: any, t: any, n: any, r: any): Promise<any>;
    animationSize(): Promise<any>;
    tween(e: any, t: any): Promise<any>;
    tweenToMarker(e: any, t: any): Promise<any>;
    setTransform(e: any): Promise<any>;
    getTransform(): Promise<any>;
    _sendMessage(e: any, t: any, n: any): Promise<any>;
    addEventListener(e: any, t: any): void;
    removeEventListener(e: any, t: any): void;
    stateMachineLoad(e: any): Promise<any>;
    stateMachineLoadData(e: any): Promise<any>;
    stateMachineStart(): Promise<any>;
    stateMachineStop(): Promise<any>;
    stateMachineSetNumericInput(e: any, t: any): Promise<any>;
    stateMachineSetBooleanInput(e: any, t: any): Promise<any>;
    stateMachineSetConfig(e: any): Promise<void>;
    stateMachineSetStringInput(e: any, t: any): Promise<any>;
    stateMachineGetNumericInput(e: any): Promise<any>;
    stateMachineGetBooleanInput(e: any): Promise<any>;
    stateMachineGetStringInput(e: any): Promise<any>;
    stateMachineGetInputs(): Promise<any>;
    stateMachineFireEvent(e: any): Promise<void>;
    stateMachineGetStatus(): Promise<any>;
    stateMachineGetCurrentState(): Promise<any>;
    stateMachineGetActiveId(): Promise<any>;
    stateMachineOverrideState(e: any, t?: boolean): Promise<any>;
    stateMachineGet(e: any): Promise<any>;
    stateMachineGetListeners(): Promise<any>;
    stateMachinePostClickEvent(e: any, t: any): Promise<any>;
    stateMachinePostPointerUpEvent(e: any, t: any): Promise<any>;
    stateMachinePostPointerDownEvent(e: any, t: any): Promise<any>;
    stateMachinePostPointerMoveEvent(e: any, t: any): Promise<any>;
    stateMachinePostPointerEnterEvent(e: any, t: any): Promise<any>;
    stateMachinePostPointerExitEvent(e: any, t: any): Promise<any>;
    _onClick(e: any): void;
    _onPointerUp(e: any): void;
    _onPointerDown(e: any): void;
    _onPointerMove(e: any): void;
    _onPointerEnter(e: any): void;
    _onPointerLeave(e: any): void;
    _setupStateMachineListeners(): Promise<void>;
    _boundOnClick: ((e: any) => void) | null | undefined;
    _boundOnPointerUp: ((e: any) => void) | null | undefined;
    _boundOnPointerDown: ((e: any) => void) | null | undefined;
    _boundOnPointerMove: ((e: any) => void) | null | undefined;
    _boundOnPointerEnter: ((e: any) => void) | null | undefined;
    _boundOnPointerLeave: ((e: any) => void) | null | undefined;
    _cleanupStateMachineListeners(): void;
  };
  setWasmUrl(e: any): void;
  registerFont(e: any, t: any): Promise<boolean>;
};
//#endregion
export { CSSResult as i, LitElement as n, TemplateResult as r, m as t };
//# sourceMappingURL=index-Bqq1Mn32.d.ts.map