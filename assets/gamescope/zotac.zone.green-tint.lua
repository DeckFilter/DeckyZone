local zotac_amoled = gamescope.config.known_displays.zotac_amoled

if zotac_amoled and zotac_amoled.colorimetry then
    zotac_amoled.colorimetry.w = {
        x = 0.3070,
        y = 0.3235,
    }

    debug("Applied DeckyZone green tint fix to zotac_amoled")
end
