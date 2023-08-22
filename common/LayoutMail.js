import image from '../assets/images/index.js';
export const htmlMailVerify = (
    emailVerificationToken,
) => ` <table width="100%" height="100%" cellpadding="0" cellspacing="0" bgcolor="#f5f6f7">
            <tbody>
                <tr>
                    <td height="50"></td>
                </tr>
                <tr>
                    <td align="center" valign="top">
                        <table
                            width="600"
                            cellpadding="0"
                            cellspacing="0"
                            bgcolor="#ffffff"
                            style="border: 1px solid #f1f2f5"
                        >
                            <tbody>
                                <tr>
                                    <td
                                        colspan="3"
                                        height="65"
                                        bgcolor="#ffffff"
                                        style="border-bottom: 1px solid #eeeeee; padding-left: 16px"
                                        align="left"
                                    >
                                        <img
                                            src=${image.logo}
                                            height="60"
                                            style="display: block; width: 140px; height: 35px"
                                            class="CToWUd"
                                            data-bit="iit"
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td colspan="3" height="20"></td>
                                </tr>
                                <tr>
                                    <td width="20"></td>
                                    <td align="left">
                                        <table cellpadding="0" cellspacing="0" width="100%">
                                            <tbody>
                                                <tr>
                                                    <td colspan="3" height="20"></td>
                                                </tr>
                                                <tr>
                                                    <td colspan="3">
                                                        <h2
                                                            style="
                                                                text-align: center;
                                                                font-size: 23px;
                                                                line-height: 28px;
                                                                color: #3d4f58;
                                                                font-weight: 500;
                                                                letter-spacing: 0;
                                                            "
                                                        >
                                                            CHÀO MỪNG BẠN ĐẾN VỚI FASHION SHOP
                                                        </h2>
                                                        <h4
                                                            style="
                                                                text-align: center;
                                                                font-size: 23px;
                                                                line-height: 28px;
                                                                color: #3d4f58;
                                                                font-weight: 500;
                                                                letter-spacing: 0;
                                                            "
                                                        >
                                                            Xác minh Email
                                                        </h4>
                                                        <div 
                                                            style="display: flex; justify-content: center !important; margin: 36px 0px; "
                                                        >
                                                            <div 
                                                            style="
                                                                text-align: center;
                                                                width: 100%;
                                                                display: flex; 
                                                                justify-content: center
                                                            "
                                                            > 
                                                            
                                                                <img
                                                                    src=${image.email}
                                                                    width= 100%
                                                                    // height=557px 
                                        
                                                                    tabindex="0"
                                                                />
                                                            </div>
                                                        </div>
                                                        <table width="100%" style="width: 100% !important">
                                                            <tbody>
                                                                <tr>
                                                                    <td align="center">
                                                                        <a
                                                                            href="${process.env.CLIENT_PAGE_URL}/register/confirm?emailVerificationToken=${emailVerificationToken}"
                                                                            style="
                                                                                display: inline-block;
                                                                                text-decoration: none;
                                                                                width: 159px;
                                                                            "
                                                                            target="_blank"
                                                                            data-saferedirecturl="${process.env.CLIENT_PAGE_URL}/register/confirm?emailVerificationToken=${emailVerificationToken}"
                                                                            ><div
                                                                                style="
                                                                                    font-family: Helvetica, Arial,
                                                                                        sans-serif;
                                                                                    width: 159px;
                                                                                    text-align: center;
                                                                                    padding: 12px 0;
                                                                                    background-color: #ee5b12;
                                                                                    border: 1px solid #db7b06;
                                                                                    border-radius: 3px;
                                                                                    display: block;
                                                                                    color: #ffffff;
                                                                                    font-size: 18px;
                                                                                    font-weight: normal;
                                                                                    text-decoration: none;
                                                                                    letter-spacing: normal;
                                                                                "
                                                                            >
                                                                                Xác minh Email
                                                                            </div></a
                                                                        >
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                        <p
                                                            style="
                                                                font-size: 15px;
                                                                line-height: 25px;
                                                                color: #21313c;
                                                                letter-spacing: 0;
                                                                margin: 36px 32px 33px;
                                                            "
                                                        >
                                                        Bảo mật tài khoản của bạn bằng cách xác minh địa chỉ email của bạn.
                                                            <br />
                                                            <br />
                                                            <b
                                                                >Liên kết này sẽ hết hạn sau 2 giờ. Để yêu cầu một liên kết xác minh<br />
                                                                khác, vui lòng
                                                                <a
                                                                    href="${process.env.CLIENT_PAGE_URL}/login"
                                                                    style="text-decoration: none; color: #007cad"
                                                                    target="_blank"
                                                                    data-saferedirecturl="${process.env.CLIENT_PAGE_URL}/login"
                                                                    >Đăng nhập</a
                                                                >
                                                                để nhắc gửi lại liên kết.
                                                            </b>
                                                        </p>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td colspan="3" height="20"></td>
                                                </tr>
                                                <tr>
                                                    <td colspan="3" style="text-align: center">
                                                        <span
                                                            style="
                                                                font-family: Helvetica, Arial, sans-serif;
                                                                font-size: 12px;
                                                                color: #cccccc;
                                                            "
                                                            >Thư này được gửi từ Fashion shop</span
                                                        >
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </td>
                                    <td width="20"></td>
                                </tr>
                                <tr>
                                    <td colspan="3" height="20"></td>
                                </tr>
                            </tbody>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td height="50"></td>
                </tr>
            </tbody>
        </table>`;

export const htmlResetEmail = ({ link, email, urlLogo }) =>
    `
    <div>
    <div
              style="
                width: 100%;
                min-height: 1000px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
            "
          >
              <div style="width= "500px"; padding: 15px; display= "flex"; justify-content= "center"; flex-direction = "column"">
                  <div
                      style="
                        margin-bottom: 15px;
                        width: 400px;
                        height: 70px;
                        padding: 5px 0;
                        border-bottom: 3px solid rgba(250, 136, 5, 0.696);
                        padding-right: 30px;
                    "
                  >
                      <img
                          style="height: 100%"
                          src= ${urlLogo}
                      />
                  </div>

                  <div style="margin-bottom: 15px">
                      <h3 style="margin-bottom: 15px">ĐẶT LẠI MẬT KHẨU</h3>
                      <div>
                          Yêu cầu đặt lại mật khẩu đã được tiếp nhận. Cửa sổ đặt lại mật khẩu được giới hạn trong 2 giờ.
                      </div>
                      <div>
                      Nếu bạn không đặt lại mật khẩu của mình trong vòng hai giờ, bạn sẽ cần gửi yêu cầu mới.
                      </div>
                      <div> Để hoàn tất quá trình đặt lại mật khẩu, hãy truy cập liên kết sau:</div>
                      <div>${link}</div>
                  </div>
                  <div style="margin-bottom: 15px">User: ${email}</div>

                  <div style="margin-bottom: 15px; width: 100%; justify-content: center; display: flex">
                      <p>Thư này được gửi từ Fashion shop</p>
                  </div>
              </div>
          </div>
    </div>
    `;
