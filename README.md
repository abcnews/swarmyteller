# Swarmyteller

A fork of [groupyteller](https://github.com/abcnews/groupyteller) which displays populations as swarms of dots that can take on simple forms and colours.

Swarmyteller has a [Builder](https://www.abc.net.au/res/sites/news-projects/swarmyteller/latest/editor.html) that exports self-sufficient markers - this means that CSV data is no longer required.

This uses the [scrollyteller](https://github.com/abcnews/scrollyteller) react component.

## Usage

The APP value ("base36") on the opening scrollyteller tag should be replaced by a [base36-encoded object](https://www.abc.net.au/res/sites/news-projects/base-36-props-converter/1.0.0/) with the following props:

`dotLabel` - small label at the bottom describing what a single dot represents (is fixed for the entire scrollyteller)

Markers should be created using the [Builder](https://www.abc.net.au/res/sites/news-projects/swarmyteller/latest/editor.html).

```
#scrollytellerNAMEswarmytellerAPP5lt7nwcky921g7tyxlofpp0rn2hyz0vph4uu1rx

#markSTATE7zmzsml4dn10y9srxrxjeg67kx0p1uioalg3kvp87jy4cvjtyss9dz0sgr933lm482p2ttiuep8xmc58cptio2sjj6pw08bp4noid471qq3lrbnphf3i2uc2yb56w8woruf8mbgqp1z69xjwp6vhr4jkis9slwcw5kd7bdn15zbfnks32hv321e789g1p

The census is Australia’s biggest survey. In 2021, as it did in previous years, it tried to survey every household in Australia.

#mark

So there’s a lot it can tell us about Australia’s xxx million people.
(Each one of these dots represents xxx number of people.)

#markSTATE10akda7u8bf5ah8kxun6x8rbgoi0i3tnnh5op591dapnata3vsle5cpttfuhk8wjqe0uh0eotoee39oxmzts8zi1upjalpll64okoz3vb9nn8d8ttc59upf7xmcg5g32kudgzym2os0rvlznhk3o8e4eifpwaynj144ac3utvo02klbk9gnjxz3yhwprj2q3xxb8158usqu56ciruzzt1mbx8v1um9mw3o896u1q8fb1

For example, on gender, we’re split almost evenly down the middle, as you’d expect, though there’s slightly more women than men.

#markSTATE3xaitmv4bytz0s1taaghix3q7vm40dwwooqczg42e0xqfoesvavlieq8m1aqdgtbbjjoinpv40nfab2terp6e14ayzmlynrvznqh2oae0ivovs2qktxalht7yx8aqlstv431f4clx2decdptiessrrychu2asr3guxab544atvjozkb66v0qck6s9yqgm0ctxl3jf28oquqsa5wc9twhyi07l1ud6omwmwa3rdljuye5c4mx1nqa9gfx

Things are less evenly split when it comes to CEOs though.

#endscrollyteller
```

## Authors

- Colin Gourlay ([gourlay.colin@abc.net.au](mailto:gourlay.colin@abc.net.au))
- Simon Elvery ([simon@elvery.net](mailto:simon@elvery.net))
- Josh Byrd ([byrd.joshua@abc.net.au](mailto:joshua.byrd@abc.net.au))
- Julian Fell ([fell.julian@abc.net.au](mailto:fell.julian@abc.net.au))
