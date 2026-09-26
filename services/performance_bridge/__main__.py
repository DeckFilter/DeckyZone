"""Opt-in service entry point; probe needs only the Python standard library."""

import argparse
import asyncio
import json
import logging
import signal

from .probe import inspect, production_controller
from .sysfs import Unavailable


async def serve(controller):
    from dbus_next.aio import MessageBus
    from dbus_next.constants import BusType

    from .dbus_service import Bridge
    from .lifecycle import notify_ready

    profile_bus = await MessageBus(bus_type=BusType.SYSTEM).connect()
    tdp_bus = None
    bridge = None
    tasks = []
    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, stop.set)
    try:
        tdp_bus = await MessageBus(bus_type=BusType.SYSTEM).connect()
        bridge = Bridge(controller, profile_bus, tdp_bus)
        await bridge.start()
        notify_ready()
        tasks = [
            asyncio.create_task(stop.wait()),
            asyncio.create_task(bridge.monitor()),
            asyncio.create_task(profile_bus.wait_for_disconnect()),
            asyncio.create_task(tdp_bus.wait_for_disconnect()),
        ]
        await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        if not stop.is_set():
            raise Unavailable(
                "Provider lost its backend or bus; manual inspection required"
            )
    finally:
        if bridge:
            await bridge.close()
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        profile_bus.disconnect()
        if tdp_bus:
            tdp_bus.disconnect()
        await asyncio.gather(
            profile_bus.wait_for_disconnect(),
            *([tdp_bus.wait_for_disconnect()] if tdp_bus else []),
            return_exceptions=True,
        )
        for sig in (signal.SIGTERM, signal.SIGINT):
            loop.remove_signal_handler(sig)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("probe", "serve"))
    parser.add_argument(
        "--enable",
        action="store_true",
        help="Explicit opt-in; does not bypass validation",
    )
    args = parser.parse_args()
    if args.command == "probe":
        report = inspect()
        print(json.dumps(report, indent=2))
        return 0 if report["available"] else 2
    if not args.enable:
        parser.error(
            "serve requires --enable; validation and ownership gates still apply"
        )
    logging.basicConfig(level=logging.INFO)
    try:
        # Check before connecting or registering any provider name.
        controller = production_controller()
        asyncio.run(serve(controller))
    except (OSError, Unavailable) as error:
        logging.error("%s", error)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
