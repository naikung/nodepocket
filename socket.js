var latitude = 13.120506778876507
var longitude = 100.91823663448366
var username = process.env.PGO_USERNAME || '';
var password = process.env.PGO_PASSWORD || '';
var provider = process.env.PGO_PROVIDER || '';
// var username = process.env.PGO_USERNAME || 'your_mail@gmail.com';
// var password = process.env.PGO_PASSWORD || 'password';
// var provider = process.env.PGO_PROVIDER || 'google';
var express = require("express")
var app = require('express')();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var fs = require('fs')
console.log("Start");
var port = 8080
server.listen(port, function() {
    console.log('Server listening at port %d', port);
});
var iosocket;
pokemonTable = {};
fortTable = {};
io.on('connection', function(socket) {
    iosocket = socket
    socket.on('get ford', function(data) {
        for (i in fortTable) socket.emit('ford', {
            id: i,
            lat: fortTable[i].lat,
            lng: fortTable[i].lng,
            last: fortTable[i].last
        });
    });
    socket.on('set coord', function(data) {
        a.SetLocation({
            type: 'coords',
            coords: {
                latitude: data.lat,
                longitude: data.lng,
                altitude: 20 + Math.random() * 5
            }
        }, function() {
            socket.emit('coord', data);
        })
    });
    socket.on('get coord', function(data) {
        location = a.GetLocationCoords();
        socket.emit('coord', {
            lat: location.latitude,
            lng: location.longitude,
        });
    });
})
var PokemonGO = require('pokemon-go-node-api')
var a = new PokemonGO.Pokeio();
//benjasiri
// var latitude = 13.731146475371327 
// var longitude = 100.56865721940994
locate = fs.readFileSync("locate.json");
if (locate) {
    try {
        obj = JSON.parse(locate)
    } finally {}
    if (obj.lat && obj.lng) latitude = obj.lat
    longitude = obj.lng
}
var location = {
    type: 'coords',
    coords: {
        latitude: latitude,
        longitude: longitude,
        altitude: 30
    }
};

function getPointDistance(lat, lng) {
    var point = a.GetLocationCoords()
    var radlat1 = Math.PI * point.latitude / 180
    var radlat2 = Math.PI * lat / 180
    var theta = point.longitude - lng
    var radtheta = Math.PI * theta / 180
    var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    dist = Math.acos(dist)
    dist = dist * 180 / Math.PI
    dist = dist * 60 * 1.1515
    dist = dist * 1609.344
    return dist
}

function getDistance(FortID) {
    if (!fortTable[FortID]) {
        console.log("NotFound " + FortID)
        return 99999999999999999;
    }
    var point = a.GetLocationCoords()
    var radlat1 = Math.PI * point.latitude / 180
    var radlat2 = Math.PI * fortTable[FortID].lat / 180
    var theta = point.longitude - fortTable[FortID].lng
    var radtheta = Math.PI * theta / 180
    var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    dist = Math.acos(dist)
    dist = dist * 180 / Math.PI
    dist = dist * 60 * 1.1515
    dist = dist * 1609.344
    return dist
}

function getPokeDistance(SpawnID) {
    if (!pokemonTable[SpawnID]) {
        console.log("NotFound " + SpawnID)
        return 99999999999999999;
    }
    var point = a.GetLocationCoords()
    var radlat1 = Math.PI * point.latitude / 180
    var radlat2 = Math.PI * pokemonTable[SpawnID].lat / 180
    var theta = point.longitude - pokemonTable[SpawnID].lon
    var radtheta = Math.PI * theta / 180
    var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    dist = Math.acos(dist)
    dist = dist * 180 / Math.PI
    dist = dist * 60 * 1.1515
    dist = dist * 1609.344
    return dist
}
var state = 0
var retry_fort = 0;
var retry_poke = 0;
var retry_item = 0;
var nearId = 'NONE';
var nearDistance = 99999999999999999;

function getPath() {
    var count_pok = 0
    for (spawn in pokemonTable) {
        count_pok++;
    }
    if (state == 0) {
        for (id in fortTable) {
            //find near
            ford = fortTable[id]
            if (new Date() - ford.last < 360000) { //
                continue;
            }
            dist = getDistance(id);
            if (dist < nearDistance && Math.random() < 0.6) {
                nearDistance = dist
                nearId = id
                state = 1;
                retry_fort = 0;
            }
        }
        return 0;
    } else if (count_pok) {
        for (spawn in pokemonTable) {
            point = a.GetLocationCoords()
            dist = getPointDistance(pokemonTable[spawn].lat, pokemonTable[spawn].lng);
            x1 = point.latitude
            y1 = point.longitude
            if (iosocket) iosocket.emit('target', {
                type: "Pokemon",
                dist: dist,
                lat: pokemonTable[spawn].lat,
                lng: pokemonTable[spawn].lng
            })
            x2 = pokemonTable[spawn].lat
            y2 = pokemonTable[spawn].lng
            var target_x = x1
            var target_y = y1
            if (dist > 5) {
                retry_poke = 0;
                if (x1 > x2) {
                    target_x = x1 - 0.00004 * Math.random()
                } else if (x1 < x2) {
                    target_x = x1 + 0.00004 * Math.random()
                }
                if (y1 > y2) {
                    target_y = y1 - 0.00004 * Math.random()
                } else if (y1 < y2) {
                    target_y = y1 + 0.00004 * Math.random()
                }
            } else if (retry_poke > 10) {
                delete(pokemonTable[spawn]);
            } else {
                retry_poke++;
                console.log("retry_poke " + retry_poke);
            }
            var loc = {
                type: 'coords',
                coords: {
                    latitude: target_x,
                    longitude: target_y,
                    altitude: 10 + Math.random() * 40
                }
            };
            return loc
            break;
        }
    } else {
        if (!fortTable[nearId] || nearId == 'NONE') {
            state = 0;
            return 0;
        }
        point = a.GetLocationCoords()
        dist = getDistance(nearId);
        x1 = point.latitude
        y1 = point.longitude
        if (iosocket) iosocket.emit('target', {
                type: "Ford",
                dist: dist,
                lat: fortTable[nearId].lat,
                lng: fortTable[nearId].lng
            })
            //console.log("GOTO ", nearId.substring(0, 8) + " Dist : " + dist)
        x2 = fortTable[nearId].lat
        y2 = fortTable[nearId].lng
        var target_x, target_y;
        if (new Date() - fortTable[nearId].last < 30000) {
            state = 0;
            nearId = "NONE"
            nearDistance = 99999999999999999
            return 0;
        } else {
            if (dist > 4) {
                if (x1 > x2) {
                    target_x = x1 - 0.00004 * Math.random()
                } else if (x1 < x2) {
                    target_x = x1 + 0.00004 * Math.random()
                }
                if (y1 > y2) {
                    target_y = y1 - 0.00004 * Math.random()
                } else if (y1 < y2) {
                    target_y = y1 + 0.00004 * Math.random()
                }
            } else if (retry_fort > 5) {
                state = 0;
                nearDistance = 99999999999999999
                nearId = "NONE"
            } else {
                retry_fort++
                x1 = x2 + (0.5 - Math.random()) * 0.000002
                y1 = y2 + (0.5 - Math.random()) * 0.000002
                console.log("retry fort ", retry_fort);
            }
        }
        var loc = {
            type: 'coords',
            coords: {
                latitude: target_x,
                longitude: target_y,
                altitude: 10 + Math.random() * 30
            }
        };
        return loc
    }
}
a.init(username, password, location, provider, function(err) {
    console.log('[i] Current location: ' + a.playerInfo.locationName);
    console.log('[i] lat/long/alt: : ' + a.playerInfo.latitude + ' ' + a.playerInfo.longitude + ' ' + a.playerInfo.altitude);
    a.GetProfile(function(err, profile) {
        if (err) throw err;
        console.log('[i] Username: ' + profile.username);
        console.log('[i] Poke Storage: ' + profile.poke_storage);
        console.log('[i] Item Storage: ' + profile.item_storage);
        var poke = 0;
        if (profile.currency[0].amount) {
            poke = profile.currency[0].amount;
        }
        console.log('[i] Pokecoin: ' + poke);
        console.log('[i] Stardust: ' + profile.currency[1].amount);
    });
    setInterval(function() {
        a.Heartbeat(function(err, hb) {
            if (err) {
                console.log(err);
                return err;
            }
            for (var i = hb.cells.length - 1; i >= 0; i--) {
                if (hb.cells[i].Fort.length) {
                    for (f in hb.cells[i].Fort) {
                        var fort = hb.cells[i].Fort[f];
                        if (fort.FortType == 1) { // NO GYM
                            if (!fortTable[fort.FortId]) {
                                console.log(fort)
                                console.log("Add Fort ", fort.FortId.substring(0, 8))
                                fortTable[fort.FortId] = {
                                    "lat": fort.Latitude,
                                    "lng": fort.Longitude,
                                    "last": 0
                                };
                                if (iosocket) iosocket.emit('ford', {
                                    id: fort.FortId,
                                    lat: fort.Latitude,
                                    lng: fort.Longitude,
                                    last: fort.last,
                                    fort: fort
                                });
                            }
                            if (getDistance(fort.FortId) < 10) {
                                (function(fort) {
                                    a.GetFort(fort.FortId, fort.Latitude, fort.Longitude, function(err, res) {
                                        if (err) {
                                            //console.log('Err : '+err);
                                        } else {
                                            if (res.experience_awarded) {
                                                console.log(fort.FortId, res)
                                                if (iosocket) iosocket.emit('exp', res.experience_awarded)
                                                var now = new Date()
                                                if (iosocket) iosocket.emit('fordVisit', {
                                                    id: fort.FortId,
                                                    lat: fort.Latitude,
                                                    lng: fort.Longitude,
                                                    last: now
                                                })
                                                fortTable[fort.FortId].last = new Date()
                                            }
                                            if (res.items_awarded) {
                                                for (i in res.items_awarded) {
                                                    if (iosocket) iosocket.emit('item', res.items_awarded[i])
                                                }
                                            }
                                            if (res.pokemon_data_egg) {
                                                km = res.pokemon_data_egg.egg_km_walked_target
                                                if (iosocket) iosocket.emit('item', {
                                                    item_id: -km,
                                                    item_count: 1
                                                })
                                            }
                                        }
                                    })
                                })(fort)
                            }
                            //console.log(" GetFort "+fort.FortId.substring(0,8) + " > coords "+fort.Latitude + "," + fort.Longitude);
                        }
                    }
                }
                for (var j = hb.cells[i].WildPokemon.length - 1; j >= 0; j--) { // use async lib with each or eachSeries should be better :)
                    var currentPokemon = hb.cells[i].WildPokemon[j];
                    (function(currentPokemon) {
                        console.log(currentPokemon)
                        var pokedexInfo = a.pokemonlist[parseInt(currentPokemon.PokedexTypeId) - 1];
                        if (pokedexInfo && pokedexInfo.name) console.log('[+] There is a ' + pokedexInfo.name + ' near!! I can try to catch it!');
                        if (iosocket) iosocket.emit('pokemonWild', currentPokemon);
                        if (!pokemonTable[currentPokemon.SpawnPointId]) {
                            pokemonTable[currentPokemon.SpawnPointId] = {
                                lat: currentPokemon.Latitude,
                                lng: currentPokemon.Longitude
                            }
                        }
                        if (getPointDistance(currentPokemon.Latitude, currentPokemon.Longitude) < 10) {
                            a.EncounterPokemon(currentPokemon, function(suc, dat) {
                                console.log("encouter", suc, dat)
                                if (pokedexInfo && pokedexInfo.name) console.log('Encountering pokemon ' + pokedexInfo.name + '...');
                                a.CatchPokemon(currentPokemon, 1, 1.950, 1, 1, function(xsuc, xdat) {
                                    var status = ['Unexpected error', 'Successful catch', 'Catch Escape', 'Catch Flee', 'Missed Catch'];
                                    console.log(xsuc, xdat);
                                    if (xdat)
                                        if (xdat.Status) {
                                            if (iosocket) iosocket.emit("catch", {
                                                status: xdat.Status,
                                                pokemon: currentPokemon,
                                                data: xdat
                                            })
                                            if (xdat.Status == 1) delete pokemonTable[currentPokemon.SpawnPointId]
                                        }
                                });
                            });
                        }
                    })(currentPokemon);
                }
                for (var j = hb.cells[i].MapPokemon.length - 1; j >= 0; j--) { // use async lib with each or eachSeries should be better :)
                    var currentPokemon = hb.cells[i].MapPokemon[j];
                    (function(currentPokemon) {
                        console.log(currentPokemon)
                        var pokedexInfo = a.pokemonlist[parseInt(currentPokemon.PokedexTypeId) - 1];
                        if (pokedexInfo && pokedexInfo.name) console.log('[+] There is a ' + pokedexInfo.name + ' near!! I can try to catch it!');
                        if (iosocket) iosocket.emit('pokemonMap', currentPokemon);
                        if (!pokemonTable[currentPokemon.SpawnPointId]) {
                            pokemonTable[currentPokemon.SpawnPointId] = {
                                lat: currentPokemon.Latitude,
                                lng: currentPokemon.Longitude
                            }
                        }
                        if (getPointDistance(currentPokemon.Latitude, currentPokemon.Longitude) < 10) {
                            a.EncounterPokemon(currentPokemon, function(suc, dat) {
                                console.log("encouter", suc, dat)
                                if (pokedexInfo && pokedexInfo.name) console.log('Encountering pokemon ' + pokedexInfo.name + '...');
                                a.CatchPokemon(currentPokemon, 1, 1.950, 1, 1, function(xsuc, xdat) {
                                    var status = ['Unexpected error', 'Successful catch', 'Catch Escape', 'Catch Flee', 'Missed Catch'];
                                    console.log(xsuc, xdat);
                                    if (xdat)
                                        if (xdat.Status) {
                                            if (iosocket) iosocket.emit("catch", {
                                                status: xdat.Status,
                                                pokemon: currentPokemon,
                                                data: xdat
                                            })
                                            if (xdat.Status == 1) delete pokemonTable[currentPokemon.SpawnPointId]
                                        }
                                });
                            });
                        }
                    })(currentPokemon);
                }
                // if (hb.cells[i].SpawnPoint){
                //     for(sp in hb.cells[i].SpawnPoint)
                //     console.log(hb.cells[i].SpawnPoint)
                // }
                if (hb.cells[i].NearbyPokemon.length) {
                    for (np in hb.cells[i].NearbyPokemon) {
                        var pokemon = a.pokemonlist[parseInt(hb.cells[i].NearbyPokemon[np].PokedexNumber) - 1];
                        if (iosocket) iosocket.emit('near pokemon', pokemon);
                        if (pokemon && pokemon.name) console.log('[+] There is a ' + pokemon.name + ' near.');
                    }
                }
            }
        });
        var point = a.GetLocationCoords()
        console.log("Location : " + point.latitude + " , " + point.longitude);
        var loc = getPath()
        if (!loc) {
            loc = {
                type: 'coords',
                coords: {
                    latitude: (point.latitude + ((Math.random() - 0.5) * 0.00005)),
                    longitude: (point.longitude + ((Math.random() - 0.5) * 0.00005)),
                    altitude: 45
                }
            }
        }
        fs.writeFileSync("locate.json", '{\n"lat":' + loc.coords.latitude + '\n,"lng":' + loc.coords.longitude + '\n}')
        a.SetLocation(loc, function() {
            if (iosocket) iosocket.emit('coord', {
                lat: loc.coords.latitude,
                lng: loc.coords.longitude
            });
        })
    }, 1500 + Math.random() * 1000);
    setInterval(function() {
        a.GetInventory(function(err, item) {
            if (err) {
                             retry_item++;
                console.log("inventory err ", retry_item)
                    //             if (retry_item > 3) {
                //
                throw err;
            }
            //         } else {
            //             if (!item.success || !item.inventory_delta.inventory_items) {
            //                 console.log("inventory null")
            //             } else {
            //                 retry_item = 0;
            //                 var inven = item.inventory_delta.inventory_items
            //                 for (i in inven) {
            //                     if (inven[i].inventory_item_data.item) {
            //                         var item = inven[i].inventory_item_data.item
            //                         if (item.item_id == 1 && item.count > 10) { //pokeball
            //                             a.DropItem(1, item.count - 10, function(err, data) {
            //                                 console.log("drop Pokeball", err, data)
            //                                 if (err) return err;
            //                                 if (iosocket) iosocket.emit('drop', {
            //                                     item_id: 1,
            //                                     item_count: data.new_count
            //                                 })
            //                             })
            //                         } else if (item.item_id == 101 && item.count > 10) {
            //                             a.DropItem(101, item.count - 10, function(err, data) {
            //                                 console.log("drop Potion", err, data)
            //                                 if (err) return err;
            //                                 if (iosocket) iosocket.emit('drop', {
            //                                     item_id: 101,
            //                                     item_count: data.new_count
            //                                 })
            //                             })
            //                         } else if (item.item_id == 102 && item.count > 10) {
            //                             a.DropItem(101, item.count - 20, function(err, data) {
            //                                 console.log("drop Super Potion", err, data)
            //                                 if (err) return err;
            //                                 if (iosocket) iosocket.emit('drop', {
            //                                     item_id: 102,
            //                                     item_count: data.new_count
            //                                 })
            //                             })
            //                         } else if (item.item_id == 201 && item.count > 20) {
            //                             a.DropItem(101, item.count - 20, function(err, data) {
            //                                 console.log("drop Revive ", err, data)
            //                                 if (err) return err;
            //                                 if (iosocket) iosocket.emit('drop', {
            //                                     item_id: 201,
            //                                     item_count: data.new_count
            //                                 })
            //                             })
            //                         }
            //                     }
            //                 }
            //             }
            //         }
        })
    }, 60000)
});
app.use('/img', express.static('img'));
app.use('/js', express.static('js'));
app.get("/", function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'))
});
app.get("/inventory", function(req, res) {
    res.sendFile(path.join(__dirname + '/inventory.html'))
});
app.get('/inven', function(req, res) {
    var body = ""
    var tmon = []
    var titem = []
    var tdex = []
    var tfamily = []
    var tegg = []
    var tstat
    a.GetInventory(function(err, item) {
        if (err) {
            res.end("{" + err + "}");
        } else {
            if (!item.success || !item.inventory_delta.inventory_items) {
                res.end("Not success");
            }
            if (item.inventory_delta) {
                var inven = item.inventory_delta.inventory_items
                for (i in inven) {
                    //body += JSON.stringify(inven[i])
                    if (inven[i].inventory_item_data.pokemon) {
                        mon = inven[i].inventory_item_data.pokemon;
                        if (mon.pokemon_id) {
                            tmon[tmon.length] = {
                                "id": mon.id,
                                "poke_id": mon.pokemon_id,
                                "cp": mon.cp,
                                "hp": mon.stamina_max,
                                "move_1": mon.move_1,
                                "move_2": mon.move_2,
                                "i_atk": mon.individual_attack,
                                "i_def": mon.individual_defense,
                                "i_sta": mon.individual_stamina,
                                "i_sum": mon.individual_attack + mon.individual_defense + mon.individual_stamina,
                                "i_rate": (mon.individual_attack + mon.individual_defense + mon.individual_stamina / 45),
                                "cp_mul": mon.cp_multiplier,
                                "nickname": mon.nickname,
                                "getdate": mon.creation_time_ms
                            }
                            body += "pokemon : " + mon.pokemon_id + " cp " + mon.cp
                                //body += mon.
                        } else if (mon.is_egg) {
                            tegg[tegg.length] = {
                                "id": mon.id,
                                "target": mon.egg_km_walked_target
                            }
                        }
                    } else if (inven[i].inventory_item_data.item) {
                        item = inven[i].inventory_item_data.item
                        titem[titem.length] = {
                            "item_id": item.item_id,
                            "count": item.count
                        }
                    } else if (inven[i].inventory_item_data.pokedex_entry) {
                        dex = inven[i].inventory_item_data.pokedex_entry
                        tdex[tdex.length] = {
                            "poke_id": dex.pokedex_entry_number,
                            "found": true
                        }
                    } else if (inven[i].inventory_item_data.pokemon_family) {
                        family = inven[i].inventory_item_data.pokemon_family
                        tfamily[tfamily.length] = {
                            "poke_id": family.family_id,
                            "candy": family.candy
                        }
                    } else if (inven[i].inventory_item_data.player_stats) {
                        stat = inven[i].inventory_item_data.player_stats
                        tstat = stat
                    } else if (inven[i].inventory_item_data.egg_incubators.egg_incubator) {
                        for (egg in inven[i].inventory_item_data.egg_incubators.egg_incubator) tegg[tegg.length] = inven[i].inventory_item_data.egg_incubators.egg_incubator[egg]
                    } else {
                        //body+=JSON.stringify(inven[i].inventory_item_data)
                    }
                }
            }
            body = "{"
            body += '"pokemon":' + JSON.stringify(tmon)
            body += ',"item":' + JSON.stringify(titem)
            body += ',"dex":' + JSON.stringify(tdex)
            body += ',"candy":' + JSON.stringify(tfamily)
            body += ',"stat":' + JSON.stringify(tstat)
            body += ',"egg":' + JSON.stringify(tegg)
            body += "}"
            res.end(body)
        }
    });
});
app.get('/itemJSON', function(req, res) {
    a.GetInventory(function(err, item) {
        if (err) {
            res.end("ERROR : " + err);
        } else {
            res.end(JSON.stringify(item));
        }
    });
});
app.get('/dropItem/:itemid/:count', function(req, res) {
    var item = parseInt(req.params.itemid)
    var count = parseInt(req.params.count)
    console.log("DropItem  " + item + " " + count)
    if (item && count) {
        a.DropItem(item, count, function() {
            res.end("DropItem");
        })
    }
})
app.get('/transferPoke/:high/:low', function(req, res) {
    var high = parseInt(req.params.high)
    var low = parseInt(req.params.low)
    console.log("Transfer  " + high + " " + low)
    if (high && low) {
        a.TransferPokemon({
            high: parseInt(high),
            low: parseInt(low),
            unsigned: true,
        }, function(data) {
            res.end("Transfer ");
        })
    }
})
app.get('/UseItemEggIncubator/:itemid/:high/:low', function(req, res) {
    var item = req.params.itemid
    var high = req.params.high
    var low = req.params.low
    console.log("UseItemEggIncubator  " + item + " " + high + " " + low)
    if (item && high && low) {
        a.UseItemEggIncubator(item, {
            high: parseInt(high),
            low: parseInt(low),
            unsigned: true
        }, function(err, dat) {
            res.end("use Incubator", err, dat);
        })
    }
})