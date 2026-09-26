"""Stop Decky's method transport before yielding during plugin unload."""

import asyncio


def stop_method_listeners():
    # Decky 3.2.9's UnixSocket listener loops on EOF without yielding. Its
    # parent closes the connection when unloading a plugin, starving async
    # cleanup. Cancel only this process's known loader method listeners before
    # the first await; _read_single_line propagates CancelledError.
    stopped = 0
    for task in asyncio.all_tasks():
        coroutine = task.get_coro()
        frame = getattr(coroutine, "cr_frame", None)
        code = getattr(coroutine, "cr_code", None)
        if (
            task is not asyncio.current_task()
            and frame is not None
            and code is not None
            and code.co_name == "_listen_for_method_call"
            and frame.f_globals.get("__name__")
            in (
                "decky_loader.localplatform.localsocket",
                "localplatform.localsocket",
            )
        ):
            task.cancel()
            stopped += 1
    return stopped
