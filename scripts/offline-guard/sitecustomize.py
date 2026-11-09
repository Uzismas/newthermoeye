import ipaddress
import socket

_original_getaddrinfo = socket.getaddrinfo
_original_connect = socket.socket.connect
_original_connect_ex = socket.socket.connect_ex


def _is_loopback(host):
    if host == "localhost":
        return True
    try:
        return ipaddress.ip_address(host).is_loopback
    except (TypeError, ValueError):
        return False


def _guarded_getaddrinfo(host, *args, **kwargs):
    if not _is_loopback(host):
        raise OSError(f"Offline runtime guard blocked name resolution for {host}.")
    return _original_getaddrinfo(host, *args, **kwargs)


def _guarded_connect(sock, address):
    if isinstance(address, tuple) and not _is_loopback(address[0]):
        raise OSError(f"Offline runtime guard blocked non-loopback connection to {address[0]}.")
    return _original_connect(sock, address)


def _guarded_connect_ex(sock, address):
    if isinstance(address, tuple) and not _is_loopback(address[0]):
        raise OSError(f"Offline runtime guard blocked non-loopback connection to {address[0]}.")
    return _original_connect_ex(sock, address)


socket.getaddrinfo = _guarded_getaddrinfo
socket.socket.connect = _guarded_connect
socket.socket.connect_ex = _guarded_connect_ex
