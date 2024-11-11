interface JQuery {
  /**
   * From @/vendors/hoverintent
   * @param options
   */
  hoverIntent: (options: {
    /**
     * Required. The handlerIn function you'd like to call on "mouseenter with intent". Your function receives the same
     * "this" and "event" objects as it would from jQuery's hover method. If the "over" function is sent alone (without
     * "out") then it will be used in both cases like the handlerInOut param.
     */
    over: JQuery.EventHandler<unknown>;
    /**
     * The handlerOut function you'd like to call on "mouseleave after timeout". Your function receives the same "this"
     * and "event" objects as it would from jQuery's hover method. Note, hoverIntent will only call the "out" function
     * if the "over" function has been called.
     */
    out?: JQuery.EventHandler<unknown>;
    /**
     * A simple delay, in milliseconds, before the "out" function is called. If the user mouses back over the element
     * before the timeout has expired the "out" function will not be called (nor will the "over" function be called).
     * This is primarily to protect against sloppy/human mousing trajectories that temporarily (and unintentionally)
     * take the user off of the target element... giving them time to return. Default timeout: 0
     */
    timeout?: number;
    /**
     * A selector string for event delegation. Used to filter the descendants of the selected elements that trigger the
     * event. If the selector is null or omitted, the event is always triggered when it reaches the selected element
     */
    selector?: string;
  }) => void;
}
